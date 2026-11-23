// The UI language shown now. useLanguage (app/hooks) sets it; components read it through useLanguage so they
// re-render on a change, code outside React (toasts, apiErrorMessage) through t() here
import { DEFAULT_LANGUAGE, translate, type Language, type TranslateParams } from "./i18n";
import { createStore } from "./store";

export const languageStore = createStore<Language>(DEFAULT_LANGUAGE);

// Outside render only: a component must use useLanguage().t, or it won't re-render when the language changes
export const t = (text: string, params?: TranslateParams): string => translate(languageStore.get(), text, params);
