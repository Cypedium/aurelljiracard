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

export type AppearanceView = 'background' | 'navbar';

const GROUP_HEADING_CLASS = 'text-xs font-semibold uppercase text-jira-secondary';

const SWATCH_CLASS =
  'relative rounded-md shadow-[inset_0_0_0_1px_rgba(9,30,66,0.15)] transition-[filter] hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jira-focus';

// Bock mitt i den valda rutan, som i Trello
const Selected = () => (
  <span className="absolute inset-0 m-auto flex size-6 items-center justify-center rounded-full bg-white/90 text-jira-text">
    <CheckIcon className="size-4" strokeWidth={2.5} aria-hidden />
  </span>
);

// Navbarens två rader i miniatyr, med textfärgen den får ihop med boardens bakgrund
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

// Egen färg med webbläsarens färgväljare; valet gäller medan man drar i den
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

// Stäng-krysset i övre högra hörnet på kontomenyn och dess paneler; stänger hela menyn
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

// Rubrik på en panel i kontomenyn; tillbaka-pilen bara på mobil, där panelen ersätter menyn
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

// En väljare i kontomenyn. Desktop: en panel till vänster om menyn (som Trellos "Tema").
// Mobil: i menyns ställe, med tillbaka-pil. Valet gäller direkt
export function AppearancePicker({ view, appearance, onChange, onBack, onClose }: PickerProps) {
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
          <h4 className={GROUP_HEADING_CLASS}>Greys</h4>
          <div className="-mt-2 grid grid-cols-2 gap-1">{NAVBAR_GREYS.map(navbarButton)}</div>
          <h4 className={GROUP_HEADING_CLASS}>Colours</h4>
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
