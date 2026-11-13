import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, appearanceVars, normalizeAppearance, type Appearance } from "./appearance";
import { readJson, writeJson } from "./storage";

// Läser valet ur localStorage (standard om det saknas eller är trasigt)
export const loadAppearance = (): Appearance =>
  readJson(APPEARANCE_STORAGE_KEY, normalizeAppearance, DEFAULT_APPEARANCE);

// Sätter CSS-variablerna på <html>; de går före standardvärdena i root.css
export const applyAppearance = (appearance: Appearance) => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(appearanceVars(appearance))) root.style.setProperty(name, value);
};

export const saveAppearance = (appearance: Appearance) => {
  applyAppearance(appearance);
  writeJson(APPEARANCE_STORAGE_KEY, appearance);
};
