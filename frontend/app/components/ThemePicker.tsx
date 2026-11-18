'use client';
import type { ComponentType, SVGProps } from 'react';
import { CheckIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { THEMES, type Theme } from '../utils/theme';
import { PanelHeader } from './AppearancePicker';

const THEME_ICONS: Record<Theme, ComponentType<SVGProps<SVGSVGElement>>> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
};

type Props = {
  theme: Theme;
  onChange: (theme: Theme) => void;
  onBack: () => void;
  onClose: () => void;
};

// Ljust, mörkt eller webbläsarens val (som Trellos "Tema"); gäller direkt
export default function ThemePicker({ theme, onChange, onBack, onClose }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <PanelHeader title="Theme" onBack={onBack} onClose={onClose} />
      <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-1">
        {THEMES.map(({ key, name }) => {
          const Icon = THEME_ICONS[key];
          const selected = theme === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(key)}
              className={`flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-jira-hover focus-visible:outline-2 focus-visible:outline-jira-focus ${selected ? 'ring-2 ring-jira-primary' : ''}`}
            >
              <Icon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
              <span className="flex-1 font-medium">{name}</span>
              {selected && <CheckIcon className="size-4 shrink-0 text-jira-primary" strokeWidth={2.5} aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-jira-subtle">
        Match browser follows your system setting. The board background and list colours stay as chosen. Saved in this
        browser.
      </p>
    </div>
  );
}
