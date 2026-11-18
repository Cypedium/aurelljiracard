import { DARK_CLASS, PREFERS_DARK_QUERY, THEME_STORAGE_KEY, normalizeTheme, resolveTheme, type Theme } from "./theme";
import { readText, writeText } from "./storage";

export const loadTheme = (): Theme => normalizeTheme(readText(THEME_STORAGE_KEY));

// Lyssnaren på webbläsarens inställning, bara medan "Match browser" är valt
let stopWatching: (() => void) | null = null;

// Sätter .dark på <html> (och color-scheme, så att scrollbars och formulärfält följer med)
export const applyTheme = (theme: Theme) => {
  stopWatching?.();
  stopWatching = null;
  const media = typeof window.matchMedia === "function" ? window.matchMedia(PREFERS_DARK_QUERY) : null;
  const update = () => {
    const resolved = resolveTheme(theme, media?.matches ?? false);
    const root = document.documentElement;
    root.classList.toggle(DARK_CLASS, resolved === "dark");
    root.style.colorScheme = resolved;
  };
  update();
  if (theme === "system" && media) {
    media.addEventListener("change", update);
    stopWatching = () => media.removeEventListener("change", update);
  }
};

export const saveTheme = (theme: Theme) => {
  applyTheme(theme);
  writeText(THEME_STORAGE_KEY, theme);
};
