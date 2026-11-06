import { describe, expect, it } from "@jest/globals";
import { formatDate, formatShortDate } from "../../app/utils/date";

describe("formatShortDate", () => {
  it("shows an ISO date as yy-mm-dd", () => {
    expect(formatShortDate("2026-10-19T08:30:00.000Z")).toBe("26-10-19");
  });
});

describe("formatDate", () => {
  it("shows an ISO date as yyyy-mm-dd", () => {
    expect(formatDate("2026-10-19T08:30:00.000Z")).toBe("2026-10-19");
  });
});
