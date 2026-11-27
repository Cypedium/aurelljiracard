import { describe, expect, it } from "@jest/globals";
import { DUPLICATE_ERROR_TYPE, duplicateAction } from "../../app/utils/duplicateCheck";

describe("duplicateAction", () => {
  it("shows the error for a taken value", () => {
    expect(duplicateAction(true, undefined)).toBe("show");
    expect(duplicateAction(true, DUPLICATE_ERROR_TYPE)).toBe("show");
  });

  it("clears its own error once the value is free", () => {
    expect(duplicateAction(false, DUPLICATE_ERROR_TYPE)).toBe("clear");
  });

  it("leaves other errors and an error-free field alone", () => {
    expect(duplicateAction(false, "too_small")).toBe("none");
    expect(duplicateAction(false, undefined)).toBe("none");
  });
});
