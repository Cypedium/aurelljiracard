import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "@jest/globals";
import { DARK_CLASS, DEFAULT_THEME, THEMES, normalizeTheme, resolveTheme, themeName } from "../../app/utils/theme";

describe("theme", () => {
  it("offers light, dark and match browser, light by default", () => {
    expect(THEMES.map((t) => t.key)).toEqual(["light", "dark", "system"]);
    expect(DEFAULT_THEME).toBe("light");
  });

  it("keeps known values and falls back to the default for anything else", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe("system");
    for (const raw of [null, undefined, "", "Dark", "blue", 1, {}]) expect(normalizeTheme(raw)).toBe(DEFAULT_THEME);
  });

  it("follows the browser only for match browser", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("names each theme", () => {
    expect(themeName("system")).toBe("Match browser");
    expect(themeName("dark")).toBe("Dark");
  });

  it("has dark colours in root.css under the class it sets", () => {
    const css = readFileSync(path.join(__dirname, "../../app/root.css"), "utf8");
    expect(css).toContain(`@custom-variant dark (&:is(.${DARK_CLASS} *));`);
    expect(css).toMatch(new RegExp(`\\n\\.${DARK_CLASS} \\{[^}]*--color-jira-surface:`));
  });
});
