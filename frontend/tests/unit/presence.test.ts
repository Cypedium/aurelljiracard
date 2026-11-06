import { describe, expect, it } from "@jest/globals";
import { lastSeenLabel } from "../../app/utils/presence";

const NOW = Date.parse("2026-11-06T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60 * 1000;

describe("lastSeenLabel", () => {
  it("says never seen without a timestamp", () => {
    expect(lastSeenLabel(null, NOW)).toBe("Never seen");
    expect(lastSeenLabel(undefined, NOW)).toBe("Never seen");
  });

  it("shows minutes, hours and days", () => {
    expect(lastSeenLabel(ago(30 * 1000), NOW)).toBe("Last seen just now");
    expect(lastSeenLabel(ago(5 * MIN), NOW)).toBe("Last seen 5 min ago");
    expect(lastSeenLabel(ago(3 * 60 * MIN), NOW)).toBe("Last seen 3 h ago");
    expect(lastSeenLabel(ago(24 * 60 * MIN), NOW)).toBe("Last seen 1 day ago");
    expect(lastSeenLabel(ago(3 * 24 * 60 * MIN), NOW)).toBe("Last seen 3 days ago");
  });

  it("treats a timestamp slightly in the future (clock skew) as just now", () => {
    expect(lastSeenLabel(ago(-5000), NOW)).toBe("Last seen just now");
  });
});
