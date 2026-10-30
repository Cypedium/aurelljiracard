import { beforeEach, describe, expect, it } from "@jest/globals";
import { canDeleteCard, canEditCard, getRole, getUsername, hasSession, isAdmin, saveSession } from "../../app/utils/session";

// Tests run in Node, so provide a minimal in-memory localStorage
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  },
});

describe("session", () => {
  beforeEach(() => store.clear());

  it("has no session or username when nothing is stored", () => {
    expect(hasSession()).toBe(false);
    expect(getUsername()).toBe("");
  });

  it("saveSession stores the username and both tokens", () => {
    saveSession("alice", "at", "rt");

    expect(store.get("username")).toBe("alice");
    expect(store.get("accessToken")).toBe("at");
    expect(store.get("refreshToken")).toBe("rt");
    expect(hasSession()).toBe(true);
    expect(getUsername()).toBe("alice");
  });

  it("counts a refresh token alone as a session", () => {
    store.set("refreshToken", "rt");

    expect(hasSession()).toBe(true);
  });

  describe("role", () => {
    // header.payload.signature; signaturen kontrolleras inte i frontend
    const token = (payload: object) =>
      `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

    it("reads the admin role from the access token", () => {
      store.set("accessToken", token({ username: "alice", role: "admin" }));

      expect(getRole()).toBe("admin");
      expect(isAdmin()).toBe(true);
    });

    it.each([
      ["no token", undefined],
      ["a token without role", token({ username: "alice" })],
      ["an unknown role", token({ role: "root" })],
      ["a malformed token", "not-a-jwt"],
    ])("falls back to user for %s", (_case, value) => {
      if (value) store.set("accessToken", value);

      expect(getRole()).toBe("user");
      expect(isAdmin()).toBe(false);
    });
  });
});

describe("card permissions", () => {
  const own = { _id: "1", username: "alice" };
  const others = { _id: "2", username: "bob" };
  const unsaved = { username: "alice" };

  it("only lets the author edit", () => {
    expect(canEditCard(own, "alice")).toBe(true);
    expect(canEditCard(others, "alice")).toBe(false);
    expect(canEditCard(unsaved, "alice")).toBe(false);
  });

  it("lets the author or an admin delete", () => {
    expect(canDeleteCard(own, "alice", false)).toBe(true);
    expect(canDeleteCard(others, "alice", false)).toBe(false);
    expect(canDeleteCard(others, "alice", true)).toBe(true);
    expect(canDeleteCard(unsaved, "alice", true)).toBe(false);
  });
});
