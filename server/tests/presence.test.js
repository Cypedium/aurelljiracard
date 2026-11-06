const { ONLINE_WINDOW_MS, isOnline, presence } = require("../utils/presence");

const NOW = Date.parse("2026-11-06T12:00:00.000Z");
const ago = (ms) => new Date(NOW - ms);

describe("isOnline", () => {
  it("is online when active within the window and not logged out since", () => {
    expect(isOnline(ago(60 * 1000), null, NOW)).toBe(true);
    expect(isOnline(ago(60 * 1000), ago(5 * 60 * 1000), NOW)).toBe(true);
  });

  it("is offline after logging out", () => {
    expect(isOnline(ago(5 * 60 * 1000), ago(60 * 1000), NOW)).toBe(false);
  });

  it("is offline when last active longer ago than the window", () => {
    expect(isOnline(ago(ONLINE_WINDOW_MS + 1), null, NOW)).toBe(false);
  });

  it("is offline when never active", () => {
    expect(isOnline(null, null, NOW)).toBe(false);
    expect(isOnline(undefined, undefined, NOW)).toBe(false);
  });
});

describe("presence", () => {
  it("returns lastActiveAt and online, without loggedOutAt", () => {
    const lastActiveAt = ago(1000);

    expect(presence({ lastActiveAt, loggedOutAt: null }, NOW)).toEqual({ lastActiveAt, online: true });
    expect(presence({}, NOW)).toEqual({ lastActiveAt: null, online: false });
  });
});
