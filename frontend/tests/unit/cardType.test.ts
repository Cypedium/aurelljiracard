import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_ISSUE_TYPES,
  EMPTY_ISSUE_TYPE_FORM,
  ISSUE_TYPE_ICONS,
  ISSUE_TYPE_SWATCHES,
  countCardsByType,
  isTakenIssueTypeLabel,
  issueTypeFormSchema,
  issueTypeOf,
  normalizeIssueTypes,
} from "../../app/utils/cardType";
import { HEX_COLOR } from "../../app/utils/color";

describe("issue type defaults", () => {
  it("has the same default types and icons as the server", () => {
    expect(DEFAULT_ISSUE_TYPES).toEqual([
      { key: "task", label: "Task", color: "#4bade8", icon: "check" },
      { key: "bug", label: "Bug", color: "#c9372c", icon: "bug" },
      { key: "doc", label: "Doc", color: "#8270db", icon: "doc" },
    ]);
    expect(ISSUE_TYPE_ICONS).toEqual(["check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb"]);
  });

  it("only offers valid swatch colours", () => {
    expect(ISSUE_TYPE_SWATCHES.every((s) => HEX_COLOR.test(s.color))).toBe(true);
  });
});

describe("normalizeIssueTypes", () => {
  it("keeps valid types in order and lowercases colours", () => {
    expect(
      normalizeIssueTypes([
        { key: "task", label: "Task", color: "#4BADE8", icon: "check", position: 0 },
        { key: "user-story", label: " Story ", color: "#1f845a", icon: "star", position: 1 },
      ]),
    ).toEqual([
      { key: "task", label: "Task", color: "#4bade8", icon: "check" },
      { key: "user-story", label: "Story", color: "#1f845a", icon: "star" },
    ]);
  });

  it("drops invalid and duplicate keys and repairs bad fields", () => {
    expect(
      normalizeIssueTypes([
        { key: "", label: "x" },
        { key: 3 },
        { key: "spike", label: "", color: "red", icon: "rocket" },
        { key: "spike", label: "Again", color: "#000000", icon: "bolt" },
      ]),
    ).toEqual([{ key: "spike", label: "spike", color: "#4bade8", icon: "check" }]);
  });

  it("falls back to the defaults for no or broken data", () => {
    expect(normalizeIssueTypes([])).toBe(DEFAULT_ISSUE_TYPES);
    expect(normalizeIssueTypes(null)).toBe(DEFAULT_ISSUE_TYPES);
  });
});

describe("issueTypeOf", () => {
  const types = [...DEFAULT_ISSUE_TYPES, { key: "spike", label: "Spike", color: "#e56910", icon: "bolt" as const }];

  it("finds the card's type", () => {
    expect(issueTypeOf(types, "spike").label).toBe("Spike");
  });

  it("treats a missing or unknown type as Task", () => {
    expect(issueTypeOf(types).key).toBe("task");
    expect(issueTypeOf(types, "epic").key).toBe("task");
    expect(issueTypeOf([], "epic").key).toBe("task");
  });
});

describe("isTakenIssueTypeLabel", () => {
  it("matches an existing name regardless of case and surrounding spaces", () => {
    expect(isTakenIssueTypeLabel(DEFAULT_ISSUE_TYPES, "Bug")).toBe(true);
    expect(isTakenIssueTypeLabel(DEFAULT_ISSUE_TYPES, "  bUG ")).toBe(true);
  });

  it("allows new and empty names", () => {
    expect(isTakenIssueTypeLabel(DEFAULT_ISSUE_TYPES, "Bugfix")).toBe(false);
    expect(isTakenIssueTypeLabel(DEFAULT_ISSUE_TYPES, "  ")).toBe(false);
  });
});

describe("countCardsByType", () => {
  it("counts cards per type, with untyped cards as Task", () => {
    expect(countCardsByType([{ type: "bug" }, {}, { type: "task" }, { type: "bug" }])).toEqual({ bug: 2, task: 2 });
    expect(countCardsByType([])).toEqual({});
  });
});

describe("issueTypeFormSchema", () => {
  const firstError = (form: object) => {
    const result = issueTypeFormSchema.safeParse(form);
    return result.success ? null : result.error.issues[0].message;
  };

  it("accepts a name, a hex colour and a known icon", () => {
    expect(firstError({ ...EMPTY_ISSUE_TYPE_FORM, label: "Story" })).toBeNull();
  });

  it.each([
    [{ ...EMPTY_ISSUE_TYPE_FORM, label: "  " }, "Issue type name is required (max 30 characters)."],
    [{ ...EMPTY_ISSUE_TYPE_FORM, label: "x".repeat(31) }, "Issue type name is required (max 30 characters)."],
    [{ ...EMPTY_ISSUE_TYPE_FORM, label: "Story", color: "green" }, "Please pick a color."],
    [{ ...EMPTY_ISSUE_TYPE_FORM, label: "Story", icon: "rocket" }, "Please pick an icon."],
  ])("rejects %j", (form, message) => {
    expect(firstError(form)).toBe(message);
  });
});
