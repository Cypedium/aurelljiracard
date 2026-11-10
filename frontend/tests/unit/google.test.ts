import { describe, expect, it } from "@jest/globals";
import { GOOGLE_BUTTON_FALLBACK_WIDTH, GOOGLE_BUTTON_MAX_WIDTH, googleButtonWidth } from "../../app/utils/google";

describe("googleButtonWidth", () => {
  it("fills the container up to Google's maximum", () => {
    expect(googleButtonWidth(280)).toBe(280);
    expect(googleButtonWidth(900)).toBe(GOOGLE_BUTTON_MAX_WIDTH);
  });

  it("uses a fallback while the container has no width yet", () => {
    expect(googleButtonWidth(0)).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
  });
});
