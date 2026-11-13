import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import {
  BOARD_BACKGROUNDS,
  BOARD_GRADIENTS,
  DEFAULT_APPEARANCE,
  NAVBAR_THEMES,
  NAV_TEXT_MIN_CONTRAST,
  appearanceVars,
  boardBackground,
  navbarTextColor,
  navbarTheme,
  normalizeAppearance,
} from "../../app/utils/appearance";
import { contrastRatio } from "../../app/utils/boardLayout";

const HEX = /^#[0-9a-f]{6}$/;

describe("appearance", () => {
  it("keeps the original board background and navbar as default", () => {
    expect(appearanceVars(DEFAULT_APPEARANCE)).toMatchObject({
      "--color-board-from": "#1c2b41",
      "--color-board-via": "#1d4f91",
      "--color-board-to": "#2b7bb9",
      "--color-nav-top": "#4a5565",
      "--color-nav-sub": "#364153",
    });
  });

  it("matches the defaults in root.css, used before the saved choice is applied", () => {
    const css = readFileSync(path.join(__dirname, "../../app/root.css"), "utf8");
    for (const [name, value] of Object.entries(appearanceVars(DEFAULT_APPEARANCE))) {
      expect(css).toContain(`${name}: ${value};`);
    }
  });

  it("has unique keys and lowercase hex colours", () => {
    for (const list of [BOARD_BACKGROUNDS, NAVBAR_THEMES]) {
      expect(new Set(list.map((x) => x.key)).size).toBe(list.length);
    }
    for (const b of BOARD_BACKGROUNDS) for (const c of [b.from, b.via, b.to, b.text]) expect(c).toMatch(HEX);
    for (const n of NAVBAR_THEMES) for (const c of [n.top, n.sub]) expect(c).toMatch(HEX);
  });

  it("falls back to the defaults for unknown or broken values", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance("x")).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ background: "nope", navbar: 3 })).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ background: "pink", navbar: "charcoal" })).toEqual({
      background: "pink",
      navbar: "charcoal",
    });
    expect(boardBackground("nope")).toBe(BOARD_GRADIENTS[0]);
    expect(navbarTheme("nope")).toBe(NAVBAR_THEMES[0]);
  });

  it("colours the navbar text like the board, unless it is too close to the navbar", () => {
    const pink = boardBackground("pink");
    const grey = navbarTheme("grey");
    expect(navbarTextColor(pink, grey)).toBe(pink.text);
    // Samma färg som navbaren: läsbar text i stället
    expect(navbarTextColor({ ...pink, text: grey.top }, grey)).toBe("#ffffff");
  });

  it("keeps the navbar text readable for every combination", () => {
    for (const b of BOARD_BACKGROUNDS) {
      for (const n of NAVBAR_THEMES) {
        expect(contrastRatio(navbarTextColor(b, n), n.top)).toBeGreaterThanOrEqual(NAV_TEXT_MIN_CONTRAST);
      }
    }
  });
});
