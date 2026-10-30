import { describe, expect, it, jest } from "@jest/globals";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import api from "../../app/api/api";
import { loginUser } from "../../app/api/endpoints";

// Tests run in Node: minimal localStorage with a stale refresh token
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: (k: string) => (k === "refreshToken" ? "rt" : null), setItem: () => {}, removeItem: () => {} },
});

describe("response interceptor", () => {
  it("passes a 401 from /auth/* through instead of refreshing (wrong password)", async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Invalid credentials." },
        headers: {},
        config,
      });
    };
    const refresh = jest.spyOn(axios, "post");

    await expect(loginUser({ username: "alice", password: "wrong" })).rejects.toMatchObject({
      response: { status: 401, data: { message: "Invalid credentials." } },
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
