import { describe, expect, it } from "@jest/globals";
import { CARD_TYPES, cardTypeLabel, cardTypeOf } from "../../app/utils/cardType";

describe("cardType", () => {
  it("has the same keys as the server", () => {
    expect(CARD_TYPES.map((t) => t.key)).toEqual(["task", "bug", "doc"]);
  });

  it("treats a missing or unknown type as Task", () => {
    expect(cardTypeOf(undefined)).toBe("task");
    expect(cardTypeOf("epic")).toBe("task");
    expect(cardTypeOf("bug")).toBe("bug");
    expect(cardTypeLabel("doc")).toBe("Doc");
    expect(cardTypeLabel()).toBe("Task");
  });
});
