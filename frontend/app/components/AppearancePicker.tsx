'use client';
import { CheckIcon, ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  BOARD_COLORS,
  BOARD_GRADIENTS,
  NAVBAR_COLORS,
  NAVBAR_GREYS,
  backgroundSwatch,
  boardBackground,
  isCustomColor,
  navbarTextColor,
  navbarTheme,
  type Appearance,
  type BoardBackground,
  type NavbarTheme,
} from '../utils/appearance';
import { PICKER_GROUP_HEADING_CLASS, PICKER_SWATCH_CLASS } from '../utils/styles';

export type AppearanceView = 'background' | 'navbar';

// A check mark in the middle of the chosen swatch, as in Trello
const Selected = () => (
  <span className="absolute inset-0 m-auto flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
    <CheckIcon className="size-4" strokeWidth={2.5} aria-hidden />
  </span>
);

// The navbar's two rows in miniature, with the text colour they get with the board's background
export const NavbarPreview = ({ appearance, themeKey }: { appearance: Appearance; themeKey: string }) => {
  const theme = navbarTheme(themeKey);
  const color = navbarTextColor(boardBackground(appearance.background), theme);
  return (
    <span className="flex w-16 shrink-0 flex-col overflow-hidden rounded" aria-hidden>
      <span className="px-1.5 py-0.5 font-brand text-[10px] font-semibold" style={{ background: theme.top, color }}>
        AURELLO
      </span>
      <span className="h-2" style={{ background: theme.sub }} />
    </span>
  );
};

// A custom colour with the browser's colour picker; the choice applies while you drag in it
const CustomColor = ({ value, selected, onChange }: { value: string; selected: boolean; onChange: (hex: string) => void }) => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-jira-hover ${selected ? 'ring-2 ring-jira-primary' : ''}`}
  >
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value.toLowerCase())}
      className="h-8 w-12 shrink-0 cursor-pointer rounded border border-jira-neutral bg-white p-0.5"
    />
    <span className="flex-1 font-medium">Custom colour</span>
    <span className="font-mono text-xs text-jira-secondary">{value}</span>
    {selected && <CheckIcon className="size-4 text-jira-primary" strokeWidth={2.5} aria-hidden />}
  </label>
);

// The close button in the top right corner of the account menu and its panels; closes the whole menu
export const CloseButton = ({ onClose, className = '' }: { onClose: () => void; className?: string }) => (
  <button
    type="button"
    onClick={onClose}
    className={`rounded-md p-1 text-jira-secondary hover:bg-jira-hover hover:text-jira-text ${className}`}
    aria-label="Close menu"
  >
    <XMarkIcon className="size-5" aria-hidden />
  </button>
);

// The heading of a panel in the account menu; the back arrow only on mobile, where the panel replaces the menu
export const PanelHeader = ({ title, onBack, onClose }: { title: string; onBack: () => void; onClose: () => void }) => (
  <div className="relative flex min-h-7 items-center justify-center">
    <button
      type="button"
      onClick={onBack}
      className="absolute left-0 rounded-md p-1 text-jira-secondary hover:bg-jira-hover md:hidden"
      aria-label="Back to the menu"
    >
      <ChevronLeftIcon className="size-5" aria-hidden />
    </button>
    <h2 className="text-sm font-semibold text-jira-secondary">{title}</h2>
    <CloseButton onClose={onClose} className="absolute right-0" />
  </div>
);

type PickerProps = {
  view: AppearanceView;
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
  onBack: () => void;
  onClose: () => void;
};

// A picker in the account menu. Desktop: a panel to the left of the menu (like Trello's "Theme").
// Mobile: in place of the menu, with a back arrow. The choice applies at once
export function AppearancePicker({ view, appearance, onChange, onBack, onClose }: PickerProps) {
  const backgroundButton = (b: BoardBackground, sizeClass: string) => (
    <button
      key={b.key}
      type="button"
      className={`${PICKER_SWATCH_CLASS} ${sizeClass}`}
      style={{ background: backgroundSwatch(b) }}
      aria-label={b.name}
      aria-pressed={appearance.background === b.key}
      title={b.name}
      onClick={() => onChange({ ...appearance, background: b.key })}
    >
      {appearance.background === b.key && <Selected />}
    </button>
  );

  const navbarButton = (n: NavbarTheme) => (
    <button
      key={n.key}
      type="button"
      className="flex items-center gap-2 rounded-md p-1.5 text-left text-sm hover:bg-jira-hover focus-visible:outline-2 focus-visible:outline-jira-focus"
      aria-pressed={appearance.navbar === n.key}
      onClick={() => onChange({ ...appearance, navbar: n.key })}
    >
      <NavbarPreview appearance={appearance} themeKey={n.key} />
      <span className="min-w-0 flex-1 truncate font-medium">{n.name}</span>
      {appearance.navbar === n.key && <CheckIcon className="size-4 shrink-0 text-jira-primary" strokeWidth={2.5} aria-hidden />}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title={view === 'background' ? 'Board background' : 'Navbar colour'} onBack={onBack} onClose={onClose} />

      {view === 'background' ? (
        <>
          <div className="grid grid-cols-2 gap-2">{BOARD_GRADIENTS.map((b) => backgroundButton(b, 'h-16'))}</div>
          <hr className="border-jira-neutral" />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">{BOARD_COLORS.map((b) => backgroundButton(b, 'h-10'))}</div>
          <CustomColor
            value={isCustomColor(appearance.background) ? appearance.background : boardBackground(appearance.background).via}
            selected={isCustomColor(appearance.background)}
            onChange={(hex) => onChange({ ...appearance, background: hex })}
          />
          <p className="text-xs text-jira-subtle">The navbar text follows the board colour. Saved in this browser.</p>
        </>
      ) : (
        <>
          <h4 className={PICKER_GROUP_HEADING_CLASS}>Greys</h4>
          <div className="-mt-2 grid grid-cols-2 gap-1">{NAVBAR_GREYS.map(navbarButton)}</div>
          <h4 className={PICKER_GROUP_HEADING_CLASS}>Colours</h4>
          <div className="-mt-2 grid grid-cols-2 gap-1">{NAVBAR_COLORS.map(navbarButton)}</div>
          <CustomColor
            value={navbarTheme(appearance.navbar).top}
            selected={isCustomColor(appearance.navbar)}
            onChange={(hex) => onChange({ ...appearance, navbar: hex })}
          />
          <p className="text-xs text-jira-subtle">
            The row below the top row gets a darker shade. Text that would match the navbar turns white or dark. Saved in
            this browser.
          </p>
        </>
      )}
    </div>
  );
}
