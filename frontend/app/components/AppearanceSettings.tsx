'use client';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import {
  Bars2Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import {
  BOARD_COLORS,
  BOARD_GRADIENTS,
  NAVBAR_THEMES,
  backgroundSwatch,
  boardBackground,
  navbarTextColor,
  navbarTheme,
  type Appearance,
  type BoardBackground,
} from '../utils/appearance';
import { DialogTitle } from './ui/dialog';

export type AppearanceView = 'background' | 'navbar';

const SWATCH_CLASS =
  'relative rounded-md shadow-[inset_0_0_0_1px_rgba(9,30,66,0.15)] transition-[filter] hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jira-focus';

// Bock mitt i den valda rutan, som i Trello
const Selected = () => (
  <span className="absolute inset-0 m-auto flex size-6 items-center justify-center rounded-full bg-white/90 text-jira-text">
    <CheckIcon className="size-4" strokeWidth={2.5} aria-hidden />
  </span>
);

// Navbarens två rader i miniatyr, med textfärgen den får ihop med boardens bakgrund
const NavbarPreview = ({ appearance, themeKey }: { appearance: Appearance; themeKey: string }) => {
  const theme = navbarTheme(themeKey);
  const color = navbarTextColor(boardBackground(appearance.background), theme);
  return (
    <span className="flex w-24 shrink-0 flex-col overflow-hidden rounded" aria-hidden>
      <span className="px-1.5 py-0.5 font-brand text-[10px] font-semibold" style={{ background: theme.top, color }}>
        AURELLO
      </span>
      <span className="h-2" style={{ background: theme.sub }} />
    </span>
  );
};

type SettingButtonProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  preview: ReactNode;
  onClick: () => void;
};

const SettingButton = ({ Icon, label, preview, onClick }: SettingButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-jira-hover focus-visible:outline-2 focus-visible:outline-jira-focus"
  >
    <Icon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
    <span className="flex-1 font-medium">{label}</span>
    {preview}
    <ChevronRightIcon className="size-4 shrink-0 text-jira-secondary" aria-hidden />
  </button>
);

// Account-dialogens Settings: knappar till de två väljarna
export function AppearanceSettings({ appearance, onOpen }: { appearance: Appearance; onOpen: (view: AppearanceView) => void }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Cog6ToothIcon className="size-4" aria-hidden />
        Settings
      </h3>
      <SettingButton
        Icon={PhotoIcon}
        label="Board background"
        preview={
          <span
            className="h-6 w-10 shrink-0 rounded"
            style={{ background: backgroundSwatch(boardBackground(appearance.background)) }}
            aria-hidden
          />
        }
        onClick={() => onOpen('background')}
      />
      <SettingButton
        Icon={Bars2Icon}
        label="Navbar colour"
        preview={<NavbarPreview appearance={appearance} themeKey={appearance.navbar} />}
        onClick={() => onOpen('navbar')}
      />
    </section>
  );
}

type PickerProps = {
  view: AppearanceView;
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
  onBack: () => void;
};

// En väljare i dialogen, med tillbaka-pil som i Trello. Valet gäller direkt
export function AppearancePicker({ view, appearance, onChange, onBack }: PickerProps) {
  const backgroundButton = (b: BoardBackground, sizeClass: string) => (
    <button
      key={b.key}
      type="button"
      className={`${SWATCH_CLASS} ${sizeClass}`}
      style={{ background: backgroundSwatch(b) }}
      aria-label={b.name}
      aria-pressed={appearance.background === b.key}
      title={b.name}
      onClick={() => onChange({ ...appearance, background: b.key })}
    >
      {appearance.background === b.key && <Selected />}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 rounded-md p-1 text-jira-secondary hover:bg-jira-hover"
          aria-label="Back to account"
        >
          <ChevronLeftIcon className="size-5" aria-hidden />
        </button>
        <DialogTitle className="text-base">{view === 'background' ? 'Board background' : 'Navbar colour'}</DialogTitle>
      </div>

      {view === 'background' ? (
        <>
          <div className="grid grid-cols-2 gap-2">{BOARD_GRADIENTS.map((b) => backgroundButton(b, 'h-16'))}</div>
          <hr className="border-jira-neutral" />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">{BOARD_COLORS.map((b) => backgroundButton(b, 'h-10'))}</div>
          <p className="text-xs text-jira-subtle">The navbar text follows the board colour. Saved in this browser.</p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {NAVBAR_THEMES.map((n) => (
              <button
                key={n.key}
                type="button"
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-jira-hover focus-visible:outline-2 focus-visible:outline-jira-focus"
                aria-pressed={appearance.navbar === n.key}
                onClick={() => onChange({ ...appearance, navbar: n.key })}
              >
                <NavbarPreview appearance={appearance} themeKey={n.key} />
                <span className="flex-1 font-medium">{n.name}</span>
                {appearance.navbar === n.key && <CheckIcon className="size-4 text-jira-primary" strokeWidth={2.5} aria-hidden />}
              </button>
            ))}
          </div>
          <p className="text-xs text-jira-subtle">Two shades of grey: the top row and the row below. Saved in this browser.</p>
        </>
      )}
    </div>
  );
}
