'use client';
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getLanguage, saveLanguage } from "../api/endpoints";
import { logError, reportError } from "../utils/apiError";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_KEY,
  detectLanguage,
  isLanguage,
  msg,
  translate,
  type Language,
  type TranslateParams,
} from "../utils/i18n";
import { languageStore } from "../utils/languageStore";
import { getUsername, hasSession, onSessionChange } from "../utils/session";
import { readText, writeText } from "../utils/storage";

// The UI language. Before login: the language last used in this browser, otherwise the browser's own.
// After login: the one saved on the user's account (GET /user/language), if they have picked one
let started = false;
let loadedFor: string | null = null;

const show = (language: Language, remember: boolean) => {
  languageStore.set(language);
  document.documentElement.lang = language;
  // Only a chosen language is remembered; a detected one keeps following the browser
  if (remember) writeText(LANGUAGE_KEY, language);
};

const loadForUser = async () => {
  if (!hasSession()) {
    loadedFor = null;
    return;
  }
  const user = getUsername();
  // onSessionChange also fires on every token refresh: load once per login
  if (loadedFor === user) return;
  loadedFor = user;
  try {
    const { language } = (await getLanguage()).data;
    if (isLanguage(language)) show(language, true);
  } catch (err) {
    // Silent: the language shown now stays
    logError("Error fetching language", err);
  }
};

const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  const saved = readText(LANGUAGE_KEY);
  if (isLanguage(saved)) show(saved, false);
  else show(detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]), false);
  loadForUser();
  onSessionChange(loadForUser);
};

// The account menu's switch. save = false in read-only mode: the choice shows and is remembered in this
// browser, but not saved on the account (like the board layout)
export const setLanguage = (language: Language, save: boolean) => {
  if (language === languageStore.get() && readText(LANGUAGE_KEY) === language) return;
  show(language, true);
  if (save && hasSession()) {
    saveLanguage(language).catch((err) =>
      reportError("Save language error", err, msg("Could not save the language."), "language"),
    );
  }
};

export function useLanguage() {
  useEffect(start, []);
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.get, () => DEFAULT_LANGUAGE);
  const t = useCallback((text: string, params?: TranslateParams) => translate(language, text, params), [language]);
  return { language, t };
}
