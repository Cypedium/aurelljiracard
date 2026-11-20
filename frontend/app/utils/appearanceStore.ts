import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, appearanceVars, normalizeAppearance, type Appearance } from "./appearance";
import { readJson, writeJson } from "./storage";

// Reads the choice from localStorage (the default if it is missing or broken)
export const loadAppearance = (): Appearance =>
  readJson(APPEARANCE_STORAGE_KEY, normalizeAppearance, DEFAULT_APPEARANCE);

// Sets the CSS variables on <html>; they win over the defaults in root.css
export const applyAppearance = (appearance: Appearance) => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(appearanceVars(appearance))) root.style.setProperty(name, value);
};

export const saveAppearance = (appearance: Appearance) => {
  applyAppearance(appearance);
  writeJson(APPEARANCE_STORAGE_KEY, appearance);
};
