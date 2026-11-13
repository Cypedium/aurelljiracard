import { describe, expect, it } from "@jest/globals";
import { HEX_COLOR, contrastRatio, mixHex, readableTextColor, sanitizeHexColor } from "../../app/utils/color";

describe("color", () => {
  it("accepts only #rrggbb and stores it in lowercase", () => {
    expect(HEX_COLOR.test("#A1b2C3")).toBe(true);
    expect(sanitizeHexColor("#A1B2C3")).toBe("#a1b2c3");
    for (const bad of ["#fff", "a1b2c3", "#a1b2c3ff", "", null, 123]) {
      expect(sanitizeHexColor(bad)).toBeUndefined();
    }
  });

  it("mixes hex colours", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("measures WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#0c66e4", "#0c66e4")).toBe(1);
  });

  it("uses dark text on light colors and white on dark ones", () => {
    expect(readableTextColor("#eed7fc")).toBe("#172b4d");
    expect(readableTextColor("#ffffff")).toBe("#172b4d");
    expect(readableTextColor("#0c66e4")).toBe("#ffffff");
    expect(readableTextColor("#000000")).toBe("#ffffff");
  });
});
