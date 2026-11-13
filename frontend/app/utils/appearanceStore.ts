import { APPEARANCE_STORAGE_KEY, appearanceVars, normalizeAppearance, type Appearance } from "./appearance";

// Läser valet ur localStorage (standard om det saknas eller är trasigt)
export const loadAppearance = (): Appearance => {
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "null"));
  } catch {
    return normalizeAppearance(null);
  }
};

// Sätter CSS-variablerna på <html>; de går före standardvärdena i root.css
export const applyAppearance = (appearance: Appearance) => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(appearanceVars(appearance))) root.style.setProperty(name, value);
};

export const saveAppearance = (appearance: Appearance) => {
  applyAppearance(appearance);
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Privat läge o.s.v.: valet gäller tills sidan laddas om
  }
};
