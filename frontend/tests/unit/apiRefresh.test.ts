import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import api from "../../app/api/api";

// Node: an in-memory sessionStorage and a window.location to send to /login
const store = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  },
});
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
Object.defineProperty(globalThis, "window", { value: { location: { href: "" } } });

const unauthorized = (config: InternalAxiosRequestConfig) =>
  new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
    status: 401,
    statusText: "Unauthorized",
    data: { message: "Token expired" },
    headers: {},
    config,
  });

beforeEach(() => {
  store.clear();
  store.set("accessToken", "expired");
  store.set("refreshToken", "secret-refresh-token");
  store.set("username", "alice");
  window.location.href = "";
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Answers 401 to the expired token and ok (with the header) to everything else
const expiredThenOk = async (config: InternalAxiosRequestConfig) => {
  const auth = String(config.headers.Authorization);
  if (auth === "Bearer expired") throw unauthorized(config);
  return { data: { auth }, status: 200, statusText: "OK", headers: {}, config };
};

describe("successful token refresh", () => {
  it("saves both new tokens and retries the request with the new access token", async () => {
    api.defaults.adapter = expiredThenOk;
    const refresh = jest
      .spyOn(axios, "post")
      .mockResolvedValueOnce({ data: { accessToken: "new-at", refreshToken: "new-rt" } });

    const res = await api.get("/board");

    expect(res.data).toEqual({ auth: "Bearer new-at" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.get("accessToken")).toBe("new-at");
    expect(store.get("refreshToken")).toBe("new-rt");
    expect(window.location.href).toBe("");
  });

  it("refreshes once for requests that fail at the same time, and retries them all", async () => {
    api.defaults.adapter = expiredThenOk;
    let finishRefresh: (value: unknown) => void = () => {};
    const refresh = jest.spyOn(axios, "post").mockImplementationOnce(
      () => new Promise((resolve) => (finishRefresh = resolve)),
    );

    const requests = Promise.all([api.get("/board"), api.get("/user"), api.get("/feature")]);
    // Let all three get their 401 before the refresh finishes
    await new Promise((resolve) => setTimeout(resolve, 0));
    finishRefresh({ data: { accessToken: "new-at", refreshToken: "new-rt" } });

    const results = await requests;
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.data)).toEqual([
      { auth: "Bearer new-at" },
      { auth: "Bearer new-at" },
      { auth: "Bearer new-at" },
    ]);
  });

  it("does not refresh a 401 from /auth/* (wrong password)", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    };
    const refresh = jest.spyOn(axios, "post");

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("failed token refresh", () => {
  it("logs only the message, clears the whole session and goes to /login", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    };
    // The refresh error carries the request, with the refresh token in the body
    const refreshError = new AxiosError("Request failed with status code 403", "ERR_BAD_REQUEST", {
      data: JSON.stringify({ refreshToken: "secret-refresh-token" }),
    } as InternalAxiosRequestConfig);
    const refresh = jest.spyOn(axios, "post").mockRejectedValueOnce(refreshError);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(api.get("/board")).rejects.toBe(refreshError);

    // The refresh goes straight through axios (not through api, which would otherwise catch its own 401)
    expect(refresh).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/refresh$/), { refreshToken: "secret-refresh-token" });

    expect(log).toHaveBeenCalledWith("Refresh token failed:", "Request failed with status code 403");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-refresh-token");
    expect(store.size).toBe(0);
    expect(window.location.href).toBe("/login");
  });
});
