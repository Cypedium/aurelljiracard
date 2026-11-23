import { msg } from "./i18n";
import { HEX_COLOR, contrastRatio, mixHex, readableTextColor } from "./color";

// Appearance (the board's background and the navbar's colour). Saved per browser, like hidden lists
export const APPEARANCE_STORAGE_KEY = "appearance";

// text: the navbar's text colour with this background, a light shade of the background's colour
export type BoardBackground = { key: string; name: string; from: string; via: string; to: string; text: string };
// top: the navbar's top row, sub: the row below (slightly darker)
export type NavbarTheme = { key: string; name: string; top: string; sub: string };
// background/navbar: a preset (key) or a custom colour (#rrggbb, lowercase)
export type Appearance = { background: string; navbar: string };

export const isCustomColor = (value: unknown): value is string => typeof value === "string" && HEX_COLOR.test(value);

const solid = (key: string, name: string, color: string, text: string): BoardBackground => ({
  key,
  name,
  from: color,
  via: color,
  to: color,
  text,
});

// Gradients (like Trello's images); the first is the board's original background
export const BOARD_GRADIENTS: BoardBackground[] = [
  { key: "ocean", name: msg("Ocean"), from: "#1c2b41", via: "#1d4f91", to: "#2b7bb9", text: "#9cc8f5" },
  { key: "ice", name: msg("Ice"), from: "#e9f2ff", via: "#cce0ff", to: "#a8c8f5", text: "#cce0ff" },
  { key: "sky", name: msg("Sky"), from: "#0c66e4", via: "#1f8fd8", to: "#36b5c8", text: "#8fd3f0" },
  { key: "dusk", name: msg("Dusk"), from: "#1c2b4a", via: "#5b3a7a", to: "#c15b9a", text: "#e9a6d0" },
  { key: "lilac", name: msg("Lilac"), from: "#6c4fb0", via: "#9a5bb0", to: "#c66aa7", text: "#d9b3f0" },
  { key: "sunset", name: msg("Sunset"), from: "#e5493a", via: "#ee7a3b", to: "#f5a243", text: "#ffc08a" },
  { key: "pink", name: msg("Pink"), from: "#e874b8", via: "#f07a9a", to: "#f78670", text: "#ffb3cf" },
  { key: "lagoon", name: msg("Lagoon"), from: "#1f7a5a", via: "#3a9e93", to: "#5cc6c9", text: "#9fe3d9" },
  { key: "night", name: msg("Night"), from: "#4a5b72", via: "#2f3e58", to: "#1c2b41", text: "#c3cfdf" },
  { key: "ember", name: msg("Ember"), from: "#4a2a14", via: "#7a2e1a", to: "#b0331e", text: "#f5a58a" },
];

export const BOARD_COLORS: BoardBackground[] = [
  solid("blue", msg("Blue"), "#0079bf", "#8cc8f0"),
  solid("orange", msg("Orange"), "#d29034", "#f5c98a"),
  solid("green", msg("Green"), "#519839", "#a8dd92"),
  solid("red", msg("Red"), "#b04632", "#f5a99a"),
  solid("purple", msg("Purple"), "#89609e", "#d6b8e6"),
  solid("rose", msg("Rose"), "#cd5a91", "#f5b0d0"),
  solid("lime", msg("Lime"), "#4bbf6b", "#a6e8b8"),
  solid("teal", msg("Teal"), "#00aecc", "#8fe0f0"),
  solid("grey", msg("Grey"), "#838c91", "#d0d5d8"),
];

export const BOARD_BACKGROUNDS = [...BOARD_GRADIENTS, ...BOARD_COLORS];

// Two shades per theme (the row below is darker); the first is the navbar's original (Tailwind's gray-600/700)
export const NAVBAR_GREYS: NavbarTheme[] = [
  { key: "grey", name: msg("Grey"), top: "#4a5565", sub: "#364153" },
  { key: "slate", name: msg("Slate"), top: "#45556c", sub: "#314158" },
  { key: "zinc", name: msg("Zinc"), top: "#52525c", sub: "#3f3f46" },
  { key: "stone", name: msg("Stone"), top: "#57534d", sub: "#44403b" },
  { key: "charcoal", name: msg("Charcoal"), top: "#27272a", sub: "#18181b" },
];

export const NAVBAR_COLORS: NavbarTheme[] = [
  { key: "navy", name: msg("Navy"), top: "#1c2b41", sub: "#101a2a" },
  { key: "blue", name: msg("Blue"), top: "#0c66e4", sub: "#0055cc" },
  { key: "teal", name: msg("Teal"), top: "#227d9b", sub: "#206a83" },
  { key: "green", name: msg("Green"), top: "#216e4e", sub: "#164b35" },
  { key: "purple", name: msg("Purple"), top: "#6e5dc6", sub: "#5e4db2" },
  { key: "pink", name: msg("Pink"), top: "#ae4787", sub: "#943d73" },
  { key: "red", name: msg("Red"), top: "#ae2e24", sub: "#8f231a" },
  { key: "orange", name: msg("Orange"), top: "#a54800", sub: "#873800" },
];

export const NAVBAR_THEMES = [...NAVBAR_GREYS, ...NAVBAR_COLORS];

export const DEFAULT_APPEARANCE: Appearance = { background: BOARD_GRADIENTS[0].key, navbar: NAVBAR_GREYS[0].key };

// Unknown or missing choices (old or edited localStorage) become the default
export const normalizeAppearance = (raw: unknown): Appearance => {
  const value = (raw ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  const pick = (raw: unknown, presets: { key: string }[], fallback: string) =>
    isCustomColor(raw) ? raw.toLowerCase() : presets.some((p) => p.key === raw) ? (raw as string) : fallback;
  return {
    background: pick(value.background, BOARD_BACKGROUNDS, DEFAULT_APPEARANCE.background),
    navbar: pick(value.navbar, NAVBAR_THEMES, DEFAULT_APPEARANCE.navbar),
  };
};

// Custom colour: a plain background; the navbar's text becomes a light shade of it
const CUSTOM_TEXT_TINT = 0.6;
// Custom navbar colour: the row below is this much darker
const CUSTOM_SUB_SHADE = 0.25;

export const boardBackground = (value: string): BoardBackground =>
  isCustomColor(value)
    ? solid(value, msg("Custom"), value, mixHex(value, "#ffffff", CUSTOM_TEXT_TINT))
    : (BOARD_BACKGROUNDS.find((b) => b.key === value) ?? BOARD_GRADIENTS[0]);

export const navbarTheme = (value: string): NavbarTheme =>
  isCustomColor(value)
    ? { key: value, name: msg("Custom"), top: value, sub: mixHex(value, "#000000", CUSTOM_SUB_SHADE) }
    : (NAVBAR_THEMES.find((n) => n.key === value) ?? NAVBAR_GREYS[0]);

// The navbar's text follows the board's colour, except when it is too close to the navbar to read: then white or dark
export const NAV_TEXT_MIN_CONTRAST = 3;
export const navbarTextColor = (background: BoardBackground, navbar: NavbarTheme): string =>
  contrastRatio(background.text, navbar.top) >= NAV_TEXT_MIN_CONTRAST ? background.text : readableTextColor(navbar.top);

// The CSS variables that root.css and the navbar read (board-from/via/to, nav-top/sub/text)
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

// A swatch in the picker: the gradient as on the board
export const backgroundSwatch = (b: BoardBackground): string =>
  `linear-gradient(135deg, ${b.from}, ${b.via}, ${b.to})`;
