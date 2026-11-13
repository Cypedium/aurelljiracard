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

const B = "b1";

// Paths must match the backend mounts in server/app.js
describe("API endpoints", () => {
  beforeEach(() => {
    Object.values(spies).forEach((spy) => spy.mockReset().mockResolvedValue(okResponse));
  });

  it.each([
    ["registerUser", () => endpoints.registerUser({ username: "a", password: "secret1" }), "post", "/auth/register"],
    ["loginUser", () => endpoints.loginUser({ username: "a", password: "secret1" }), "post", "/auth/login"],
    ["googleLogin", () => endpoints.googleLogin("cred"), "post", "/auth/google"],
    ["logoutUser", () => endpoints.logoutUser("rt"), "post", "/auth/logout"],
    ["getBoards", () => endpoints.getBoards(), "get", "/board"],
    ["createInvite", () => endpoints.createInvite(B), "post", "/board/b1/invite"],
    ["deleteInvite", () => endpoints.deleteInvite(B), "delete", "/board/b1/invite"],
    ["joinBoard", () => endpoints.joinBoard("t-1_x"), "post", "/invite/t-1_x"],
    ["getMembers", () => endpoints.getMembers(B), "get", "/board/b1/member"],
    ["removeMember", () => endpoints.removeMember(B, "u1"), "delete", "/board/b1/member/u1"],
    ["getCards", () => endpoints.getCards(B), "get", "/board/b1/card"],
    ["submitCard", () => endpoints.submitCard(B, { rating: 3, comment: "c", productId: "p" }), "post", "/board/b1/card"],
    ["updateCard", () => endpoints.updateCard(B, "abc", { rating: 3, comment: "c", productId: "p" }), "put", "/board/b1/card/abc"],
    ["updateCardStatus", () => endpoints.updateCardStatus(B, "abc", "done"), "patch", "/board/b1/card/abc/status"],
    ["deleteCard", () => endpoints.deleteCard(B, "abc"), "delete", "/board/b1/card/abc"],
    ["getUsers", () => endpoints.getUsers(), "get", "/user"],
    ["getLayout", () => endpoints.getLayout(), "get", "/user/layout"],
    ["saveLayout", () => endpoints.saveLayout({ cards: [] }), "put", "/user/layout"],
    ["connectGoogle", () => endpoints.connectGoogle("cred"), "post", "/user/google"],
    ["getColumns", () => endpoints.getColumns(B), "get", "/board/b1/column"],
    ["createColumn", () => endpoints.createColumn(B, { title: "Review" }), "post", "/board/b1/column"],
    ["updateColumn", () => endpoints.updateColumn(B, "in-progress", { title: "Doing", color: null }), "put", "/board/b1/column/in-progress"],
    ["deleteColumn", () => endpoints.deleteColumn(B, "review"), "delete", "/board/b1/column/review"],
    ["reorderColumns", () => endpoints.reorderColumns(B, ["done", "todo"]), "put", "/board/b1/column"],
    ["getIssueTypes", () => endpoints.getIssueTypes(B), "get", "/board/b1/issue-type"],
    ["createIssueType", () => endpoints.createIssueType(B, { label: "Story", color: "#1f845a", icon: "star" }), "post", "/board/b1/issue-type"],
    ["deleteIssueType", () => endpoints.deleteIssueType(B, "story"), "delete", "/board/b1/issue-type/story"],
    ["updateUser", () => endpoints.updateUser("u1", { role: "admin" }), "patch", "/user/u1"],
    ["deleteUser", () => endpoints.deleteUser("u1"), "delete", "/user/u1"],
    ["revokeUserSessions", () => endpoints.revokeUserSessions("u1"), "post", "/user/u1/logout"],
  ] as const)("%s calls %s %s", async (_name, call, method, path) => {
    await call();

    expect(spies[method].mock.calls[0][0]).toBe(path);
  });

  it("submitCard never sends a username", async () => {
    await endpoints.submitCard(B, { rating: 3, comment: "c", productId: "p" });

    expect(spies.post.mock.calls[0][1]).not.toHaveProperty("username");
  });

  it("submitCard sends the board column when given", async () => {
    await endpoints.submitCard(B, { rating: 3, comment: "c", productId: "p", status: "test" });

    expect(spies.post.mock.calls[0][1]).toHaveProperty("status", "test");
  });

  it("updateCard never sends a username", async () => {
    await endpoints.updateCard(B, "abc", { rating: 3, comment: "c", productId: "p" });

    expect(spies.put.mock.calls[0][1]).not.toHaveProperty("username");
  });
});
