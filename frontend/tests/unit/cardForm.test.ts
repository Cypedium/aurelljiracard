import { describe, expect, it } from "@jest/globals";
import { COMMENT_MAX_LENGTH, PRIORITIES, PRODUCT_ID_MAX_LENGTH, cardFormSchema, cardToFormValues, takenIssueKeys } from "../../app/utils/cardForm";

const valid = { type: "task", comment: "Fix the login page", productId: "AGB-12", rating: 3 };

// Första felmeddelandet, eller null om formuläret är giltigt
const firstError = (form: object) => {
  const result = cardFormSchema.safeParse(form);
  return result.success ? null : result.error.issues[0].message;
};

describe("cardFormSchema", () => {
  it("accepts a valid form and trims text", () => {
    const result = cardFormSchema.safeParse({ ...valid, comment: "  Fix it  " });
    expect(result.success && result.data.comment).toBe("Fix it");
  });

  it("requires a priority", () => {
    expect(firstError({ ...valid, rating: 0 })).toBe("Please select a priority.");
  });

  it.each([
    ["summary", { ...valid, comment: "   " }, /Summary is required/],
    ["summary", { ...valid, comment: "x".repeat(COMMENT_MAX_LENGTH + 1) }, /Summary is required/],
    ["issue key", { ...valid, productId: "" }, /Issue key must look like MA-100/],
    ["issue key", { ...valid, productId: "MA-1000" }, /Issue key must look like MA-100/],
  ])("rejects an empty or too long %s", (_field, form, message) => {
    expect(firstError(form)).toMatch(message);
  });

  it.each(["MA-100", "abc-12", "A-1"])("accepts the issue key %s", (productId) => {
    expect(firstError({ ...valid, productId })).toBeNull();
  });

  it.each(["1MA-10", "MA100", "MA-", "-100", "MA-AB", "MA 10", "MA_10"])("rejects the issue key %s", (productId) => {
    expect(firstError({ ...valid, productId })).toMatch(/Issue key must look like MA-100/);
  });

  it("limits the issue key to 6 characters", () => {
    expect(PRODUCT_ID_MAX_LENGTH).toBe(6);
  });

  it("rejects an unknown issue type", () => {
    expect(firstError({ ...valid, type: "epic" })).not.toBeNull();
  });

  it.each([
    ["summary", { ...valid, comment: "this is shit" }],
  ])("rejects profanity in the %s", (_field, form) => {
    expect(firstError(form)).toMatch(/inappropriate language/);
  });
});

describe("PRIORITIES", () => {
  it("is 1 to 5", () => {
    expect(PRIORITIES).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("cardToFormValues", () => {
  const card = { _id: "1", rating: 4, comment: "Crash", productId: "AGB-1", username: "alice", submittedAt: "2026-10-19T08:00:00.000Z" };

  it("copies the editable fields", () => {
    expect(cardToFormValues({ ...card, type: "bug" })).toEqual({ type: "bug", comment: "Crash", productId: "AGB-1", rating: 4 });
  });

  it("treats a card without type as a task", () => {
    expect(cardToFormValues(card).type).toBe("task");
  });
});

describe("takenIssueKeys", () => {
  const cards = [
    { _id: "1", productId: "MA-1" },
    { _id: "2", productId: "MA-2" },
  ];

  it("lists the keys of all cards, matched exactly", () => {
    const taken = takenIssueKeys(cards);
    expect(taken.has("MA-1")).toBe(true);
    expect(taken.has("ma-1")).toBe(false);
    expect(taken.has("MA-3")).toBe(false);
  });

  it("lets the edited card keep its own key", () => {
    const taken = takenIssueKeys(cards, "1");
    expect(taken.has("MA-1")).toBe(false);
    expect(taken.has("MA-2")).toBe(true);
  });
});
