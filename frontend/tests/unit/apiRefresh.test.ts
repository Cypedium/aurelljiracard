import { describe, expect, it, jest } from "@jest/globals";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import api from "../../app/api/api";

// Node: sessionStorage i minnet och en window.location att skicka till /login
const store = new Map<string, string>([
  ["accessToken", "expired"],
  ["refreshToken", "secret-refresh-token"],
  ["username", "alice"],
]);
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

describe("failed token refresh", () => {
  it("logs only the message, clears the whole session and goes to /login", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    };
    // Refresh-felet bär requesten, med refresh-tokenet i body
    const refreshError = new AxiosError("Request failed with status code 403", "ERR_BAD_REQUEST", {
      data: JSON.stringify({ refreshToken: "secret-refresh-token" }),
    } as InternalAxiosRequestConfig);
    const refresh = jest.spyOn(axios, "post").mockRejectedValueOnce(refreshError);
    const log = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(api.get("/board")).rejects.toBe(refreshError);

    // Förnyelsen går direkt med axios (inte via api, som annars skulle fånga sin egen 401)
    expect(refresh).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/refresh$/), { refreshToken: "secret-refresh-token" });

    expect(log).toHaveBeenCalledWith("Refresh token failed:", "Request failed with status code 403");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-refresh-token");
    expect(store.size).toBe(0);
    expect(window.location.href).toBe("/login");
  });
});
