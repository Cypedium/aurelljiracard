import { contrastRatio, readableTextColor } from "./boardLayout";

// Utseende (boardens bakgrund och navbarens färg). Sparas per webbläsare, som dolda listor
export const APPEARANCE_STORAGE_KEY = "appearance";

// text: navbarens textfärg med den här bakgrunden, en ljus ton av bakgrundens färg
export type BoardBackground = { key: string; name: string; from: string; via: string; to: string; text: string };
// top: navbarens översta rad, sub: raden under (lite mörkare)
export type NavbarTheme = { key: string; name: string; top: string; sub: string };
export type Appearance = { background: string; navbar: string };

const solid = (key: string, name: string, color: string, text: string): BoardBackground => ({
  key,
  name,
  from: color,
  via: color,
  to: color,
  text,
});

// Toningar (som Trellos bilder); den första är boardens ursprungliga bakgrund
export const BOARD_GRADIENTS: BoardBackground[] = [
  { key: "ocean", name: "Ocean", from: "#1c2b41", via: "#1d4f91", to: "#2b7bb9", text: "#9cc8f5" },
  { key: "ice", name: "Ice", from: "#e9f2ff", via: "#cce0ff", to: "#a8c8f5", text: "#cce0ff" },
  { key: "sky", name: "Sky", from: "#0c66e4", via: "#1f8fd8", to: "#36b5c8", text: "#8fd3f0" },
  { key: "dusk", name: "Dusk", from: "#1c2b4a", via: "#5b3a7a", to: "#c15b9a", text: "#e9a6d0" },
  { key: "lilac", name: "Lilac", from: "#6c4fb0", via: "#9a5bb0", to: "#c66aa7", text: "#d9b3f0" },
  { key: "sunset", name: "Sunset", from: "#e5493a", via: "#ee7a3b", to: "#f5a243", text: "#ffc08a" },
  { key: "pink", name: "Pink", from: "#e874b8", via: "#f07a9a", to: "#f78670", text: "#ffb3cf" },
  { key: "lagoon", name: "Lagoon", from: "#1f7a5a", via: "#3a9e93", to: "#5cc6c9", text: "#9fe3d9" },
  { key: "night", name: "Night", from: "#4a5b72", via: "#2f3e58", to: "#1c2b41", text: "#c3cfdf" },
  { key: "ember", name: "Ember", from: "#4a2a14", via: "#7a2e1a", to: "#b0331e", text: "#f5a58a" },
];

export const BOARD_COLORS: BoardBackground[] = [
  solid("blue", "Blue", "#0079bf", "#8cc8f0"),
  solid("orange", "Orange", "#d29034", "#f5c98a"),
  solid("green", "Green", "#519839", "#a8dd92"),
  solid("red", "Red", "#b04632", "#f5a99a"),
  solid("purple", "Purple", "#89609e", "#d6b8e6"),
  solid("rose", "Rose", "#cd5a91", "#f5b0d0"),
  solid("lime", "Lime", "#4bbf6b", "#a6e8b8"),
  solid("teal", "Teal", "#00aecc", "#8fe0f0"),
  solid("grey", "Grey", "#838c91", "#d0d5d8"),
];

export const BOARD_BACKGROUNDS = [...BOARD_GRADIENTS, ...BOARD_COLORS];

// Två gråtoner per tema; det första är navbarens ursprungliga (Tailwinds gray-600/700)
export const NAVBAR_THEMES: NavbarTheme[] = [
  { key: "grey", name: "Grey", top: "#4a5565", sub: "#364153" },
  { key: "slate", name: "Slate", top: "#45556c", sub: "#314158" },
  { key: "zinc", name: "Zinc", top: "#52525c", sub: "#3f3f46" },
  { key: "stone", name: "Stone", top: "#57534d", sub: "#44403b" },
  { key: "charcoal", name: "Charcoal", top: "#27272a", sub: "#18181b" },
];

export const DEFAULT_APPEARANCE: Appearance = { background: BOARD_GRADIENTS[0].key, navbar: NAVBAR_THEMES[0].key };

// Okända eller saknade val (gammal eller ändrad localStorage) blir standard
export const normalizeAppearance = (raw: unknown): Appearance => {
  const value = (raw ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  return {
    background: BOARD_BACKGROUNDS.some((b) => b.key === value.background)
      ? (value.background as string)
      : DEFAULT_APPEARANCE.background,
    navbar: NAVBAR_THEMES.some((n) => n.key === value.navbar) ? (value.navbar as string) : DEFAULT_APPEARANCE.navbar,
  };
};

export const boardBackground = (key: string): BoardBackground =>
  BOARD_BACKGROUNDS.find((b) => b.key === key) ?? BOARD_GRADIENTS[0];

export const navbarTheme = (key: string): NavbarTheme => NAVBAR_THEMES.find((n) => n.key === key) ?? NAVBAR_THEMES[0];

// Navbarens text följer boardens färg, utom när den är för lik navbaren för att läsas: då vit eller mörk
export const NAV_TEXT_MIN_CONTRAST = 3;
export const navbarTextColor = (background: BoardBackground, navbar: NavbarTheme): string =>
  contrastRatio(background.text, navbar.top) >= NAV_TEXT_MIN_CONTRAST ? background.text : readableTextColor(navbar.top);

// CSS-variablerna som root.css och navbaren läser (board-from/via/to, nav-top/sub/text)
export const appearanceVars = (appearance: Appearance): Record<string, string> => {
  const background = boardBackground(appearance.background);
  const navbar = navbarTheme(appearance.navbar);
  return {
    "--color-board-from": background.from,
    "--color-board-via": background.via,
    "--color-board-to": background.to,
    "--color-nav-top": navbar.top,
    "--color-nav-sub": navbar.sub,
    "--color-nav-text": navbarTextColor(background, navbar),
  };
};

// En ruta i väljaren: toningen som på boarden
export const backgroundSwatch = (b: BoardBackground): string =>
  `linear-gradient(135deg, ${b.from}, ${b.via}, ${b.to})`;
