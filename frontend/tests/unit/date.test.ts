import { describe, expect, it } from "@jest/globals";
import { formatShortDate } from "../../app/utils/date";

describe("formatShortDate", () => {
  it("shows an ISO date as yy-mm-dd", () => {
    expect(formatShortDate("2026-10-19T08:30:00.000Z")).toBe("26-10-19");
  });
});
