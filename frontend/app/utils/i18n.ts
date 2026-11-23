// UI languages. The English text is the key (t("Create card")); app/i18n/sv.ts holds the Swedish for every key,
// including the frontend's validation messages and the backend's { message } errors. Must match "languages" in
// shared/contract.json and the Java Language enum
import { SV, SV_PATTERNS } from "../i18n/sv";

export const LANGUAGES = ["en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";
// localStorage: the last language used in this browser, so the login page and the first paint use it
export const LANGUAGE_KEY = "language";

export type TranslateParams = Record<string, string | number>;
// useLanguage().t, or t from utils/languageStore outside React
export type Translate = (text: string, params?: TranslateParams) => string;

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

// The first of the browser's preferred languages that we have ("sv-SE" → sv); English otherwise
export const detectLanguage = (preferred: readonly string[]): Language => {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
};

// "{name}" → params.name; unknown placeholders stay as they are
export const interpolate = (text: string, params?: TranslateParams): string =>
  params ? text.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match)) : text;

// Swedish for an English text: the dictionary, then the patterns (backend messages with a variable part)
export const toSwedish = (text: string): string | undefined => {
  const exact = SV[text];
  if (exact !== undefined) return exact;
  for (const [pattern, replace] of SV_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return replace(match);
  }
  return undefined;
};

// Untranslated texts fall back to the English, so a missing entry never shows a key
export const translate = (language: Language, text: string, params?: TranslateParams): string =>
  interpolate(language === "sv" ? (toSwedish(text) ?? text) : text, params);

// Marks an English text to translate later (constants in app/utils, translated with t() when shown).
// Lets i18n.test.ts find every text that needs a Swedish entry
export const msg = (text: string): string => text;
