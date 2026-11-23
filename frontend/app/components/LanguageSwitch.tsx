'use client';
import type { ComponentType } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { setLanguage, useLanguage } from '../hooks/useLanguage';
import { useFeatures } from '../hooks/useFeatures';
import type { Language } from '../utils/i18n';
import { LANGUAGE_FLAG_CLASS, LANGUAGE_OPTION_CLASS } from '../utils/styles';
import { SwedishFlag, UkFlag } from './Flags';

// Each language's name in its own language, so you can find yours whatever is shown now
const OPTIONS: { language: Language; name: string; Flag: ComponentType<{ className?: string }> }[] = [
  { language: 'en', name: 'English', Flag: UkFlag },
  { language: 'sv', name: 'Svenska', Flag: SwedishFlag },
];

// The account menu's language switch: one flag per language. Saved on the account (GET/PUT /user/language);
// in read-only mode only in this browser, like the board layout
export default function LanguageSwitch() {
  const { language, t } = useLanguage();
  const { canWrite } = useFeatures();
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <LanguageIcon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
      <span className="flex-1">{t('Language')}</span>
      <div role="radiogroup" aria-label={t('Language')} className="flex gap-1 rounded-md bg-white/10 p-0.5">
        {OPTIONS.map(({ language: option, name, Flag }) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={language === option}
            aria-label={name}
            title={name}
            lang={option}
            onClick={() => setLanguage(option, canWrite)}
            className={LANGUAGE_OPTION_CLASS}
          >
            <Flag className={LANGUAGE_FLAG_CLASS} />
          </button>
        ))}
      </div>
    </div>
  );
}
