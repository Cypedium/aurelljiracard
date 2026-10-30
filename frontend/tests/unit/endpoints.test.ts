import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import api from "../../app/api/api";
import * as endpoints from "../../app/api/endpoints";

const okResponse = { status: 200, data: {} } as never;
const spies = {
  get: jest.spyOn(api, "get"),
  post: jest.spyOn(api, "post"),
  put: jest.spyOn(api, "put"),
  patch: jest.spyOn(api, "patch"),
  delete: jest.spyOn(api, "delete"),
};

// Paths must match the backend mounts in server/app.js
describe("API endpoints", () => {
  beforeEach(() => {
    Object.values(spies).forEach((spy) => spy.mockReset().mockResolvedValue(okResponse));
  });

  it.each([
    ["registerUser", () => endpoints.registerUser({ username: "a", password: "secret1" }), "post", "/auth/register"],
    ["loginUser", () => endpoints.loginUser({ username: "a", password: "secret1" }), "post", "/auth/login"],
    ["logoutUser", () => endpoints.logoutUser("rt"), "post", "/auth/logout"],
    ["refreshToken", () => endpoints.refreshToken("rt"), "post", "/auth/refresh"],
    ["getCards", () => endpoints.getCards(), "get", "/card"],
    ["submitCard", () => endpoints.submitCard({ rating: 3, comment: "c", productId: "p" }), "post", "/card"],
    ["updateCard", () => endpoints.updateCard("abc", { rating: 3, comment: "c", productId: "p" }), "put", "/card/abc"],
    ["updateCardStatus", () => endpoints.updateCardStatus("abc", "done"), "patch", "/card/abc/status"],
    ["deleteCard", () => endpoints.deleteCard("abc"), "delete", "/card/abc"],
    ["getUsers", () => endpoints.getUsers(), "get", "/user"],
    ["getLayout", () => endpoints.getLayout(), "get", "/user/layout"],
    ["saveLayout", () => endpoints.saveLayout({ cols: 4, headers: [] }), "put", "/user/layout"],
  ] as const)("%s calls %s %s", async (_name, call, method, path) => {
    await call();

    expect(spies[method].mock.calls[0][0]).toBe(path);
  });

  it("submitCard never sends a username", async () => {
    await endpoints.submitCard({ rating: 3, comment: "c", productId: "p" });

    expect(spies.post.mock.calls[0][1]).not.toHaveProperty("username");
  });

  it("submitCard sends the board column when given", async () => {
    await endpoints.submitCard({ rating: 3, comment: "c", productId: "p", status: "test" });

    expect(spies.post.mock.calls[0][1]).toHaveProperty("status", "test");
  });

  it("updateCard never sends a username", async () => {
    await endpoints.updateCard("abc", { rating: 3, comment: "c", productId: "p" });

    expect(spies.put.mock.calls[0][1]).not.toHaveProperty("username");
  });
});
