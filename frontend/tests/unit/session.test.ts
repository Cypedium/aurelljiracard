import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  SIGNED_OUT,
  canDeleteCard,
  canEditCard,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getRole,
  getUsername,
  hasSession,
  isAdmin,
  onSessionChange,
  saveSession,
  saveTokens,
  sessionSnapshot,
  tokenUsername,
} from "../../app/utils/session";

// Tests run in Node, so provide minimal in-memory sessionStorage and localStorage
const memoryStorage = (map: Map<string, string>) => ({
  getItem: (k: string) => map.get(k) ?? null,
  setItem: (k: string, v: string) => map.set(k, v),
  removeItem: (k: string) => map.delete(k),
});
const store = new Map<string, string>();
const legacyStore = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", { value: memoryStorage(store) });
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(legacyStore) });

describe("session", () => {
  beforeEach(() => {
    store.clear();
    legacyStore.clear();
  });

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

  it("ignores and removes a login left in localStorage by older versions", () => {
    legacyStore.set("accessToken", "old-at");
    legacyStore.set("refreshToken", "old-rt");
    legacyStore.set("username", "alice");
    legacyStore.set("user_layout", "{}");

    expect(hasSession()).toBe(false);

    saveSession("alice", "at", "rt");

    expect([...legacyStore.keys()]).toEqual(["user_layout"]);
  });

  it("saveTokens replaces both tokens and keeps the username", () => {
    saveSession("alice", "at", "rt");
    saveTokens("at2", "rt2");

    expect(getAccessToken()).toBe("at2");
    expect(getRefreshToken()).toBe("rt2");
    expect(getUsername()).toBe("alice");
  });

  it("clearSession removes the tokens, the username and an old localStorage login", () => {
    saveSession("alice", "at", "rt");
    store.set("pending_invite", "tok");
    legacyStore.set("accessToken", "old-at");

    clearSession();

    expect(hasSession()).toBe(false);
    expect(getUsername()).toBe("");
    expect([...store.keys()]).toEqual(["pending_invite"]);
    expect(legacyStore.size).toBe(0);
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

    it("tokenUsername reads the stored name, also with non-ASCII letters", () => {
      expect(tokenUsername(token({ username: "Mike" }))).toBe("Mike");
      expect(tokenUsername(token({ username: "Åsa" }))).toBe("Åsa");
      expect(tokenUsername(token({ role: "user" }))).toBeNull();
      expect(tokenUsername("not-a-jwt")).toBeNull();
    });
  });

  describe("change notifications and snapshot", () => {
    const token = (payload: object) =>
      `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

    it("notifies on login, token refresh and logout, once each", () => {
      const listener = jest.fn();
      const unsubscribe = onSessionChange(listener);

      saveSession("alice", "at", "rt");
      expect(listener).toHaveBeenCalledTimes(1);
      saveTokens("at2", "rt2");
      expect(listener).toHaveBeenCalledTimes(2);
      clearSession();
      expect(listener).toHaveBeenCalledTimes(3);

      unsubscribe();
      saveSession("alice", "at", "rt");
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("reads login, username and admin role", () => {
      expect(sessionSnapshot()).toEqual(SIGNED_OUT);

      saveSession("alice", token({ username: "alice", role: "admin" }), "rt");

      expect(sessionSnapshot()).toEqual({ loggedIn: true, username: "alice", admin: true });
    });

    it("returns the same object until something changes", () => {
      saveSession("alice", token({ role: "user" }), "rt");
      const first = sessionSnapshot();

      saveTokens(token({ role: "user" }), "rt2");
      expect(sessionSnapshot()).toBe(first);

      saveTokens(token({ role: "admin" }), "rt3");
      expect(sessionSnapshot()).not.toBe(first);
      expect(sessionSnapshot().admin).toBe(true);
    });
  });
});

describe("card permissions", () => {
  const own = { _id: "1", username: "alice" };
  const others = { _id: "2", username: "bob" };
  const unsaved = { username: "alice" };

  it("lets every board member edit any saved card", () => {
    expect(canEditCard(own)).toBe(true);
    expect(canEditCard(others)).toBe(true);
    expect(canEditCard(unsaved)).toBe(false);
  });

  it("lets the author or an admin delete", () => {
    expect(canDeleteCard(own, "alice", false)).toBe(true);
    expect(canDeleteCard(others, "alice", false)).toBe(false);
    expect(canDeleteCard(others, "alice", true)).toBe(true);
    expect(canDeleteCard(unsaved, "alice", true)).toBe(false);
  });
});
