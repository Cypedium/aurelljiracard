// Ljust eller mörkt läge för menyer, kort och formulär (inte boardens bakgrund, navbaren eller listornas färger).
// Sparas per webbläsare, som utseendet
export const THEME_STORAGE_KEY = "theme";

export const THEMES = [
  { key: "light", name: "Light" },
  { key: "dark", name: "Dark" },
  { key: "system", name: "Match browser" },
] as const;

export type Theme = (typeof THEMES)[number]["key"];
export type ResolvedTheme = Exclude<Theme, "system">;

// Ljust som förr tills användaren väljer något annat
export const DEFAULT_THEME: Theme = "light";

// Klassen på <html> som root.css och Tailwinds dark:-variant läser
export const DARK_CLASS = "dark";
export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

export const normalizeTheme = (raw: unknown): Theme =>
  THEMES.some((t) => t.key === raw) ? (raw as Theme) : DEFAULT_THEME;

// "Match browser" följer webbläsarens/OS:ets inställning
export const resolveTheme = (theme: Theme, prefersDark: boolean): ResolvedTheme =>
  theme === "system" ? (prefersDark ? "dark" : "light") : theme;

export const themeName = (theme: Theme): string => THEMES.find((t) => t.key === theme)?.name ?? THEMES[0].name;
