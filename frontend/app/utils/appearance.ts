import { HEX_COLOR, contrastRatio, readableTextColor } from "./boardLayout";

// Utseende (boardens bakgrund och navbarens färg). Sparas per webbläsare, som dolda listor
export const APPEARANCE_STORAGE_KEY = "appearance";

// text: navbarens textfärg med den här bakgrunden, en ljus ton av bakgrundens färg
export type BoardBackground = { key: string; name: string; from: string; via: string; to: string; text: string };
// top: navbarens översta rad, sub: raden under (lite mörkare)
export type NavbarTheme = { key: string; name: string; top: string; sub: string };
// background/navbar: ett förval (key) eller en egen färg (#rrggbb, gemener)
export type Appearance = { background: string; navbar: string };

// Blandar två #rrggbb-färger; amount 0 = a, 1 = b
export const mixHex = (a: string, b: string, amount: number): string => {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
};

export const isCustomColor = (value: unknown): value is string => typeof value === "string" && HEX_COLOR.test(value);

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

// Två toner per tema (raden under är mörkare); det första är navbarens ursprungliga (Tailwinds gray-600/700)
export const NAVBAR_GREYS: NavbarTheme[] = [
  { key: "grey", name: "Grey", top: "#4a5565", sub: "#364153" },
  { key: "slate", name: "Slate", top: "#45556c", sub: "#314158" },
  { key: "zinc", name: "Zinc", top: "#52525c", sub: "#3f3f46" },
  { key: "stone", name: "Stone", top: "#57534d", sub: "#44403b" },
  { key: "charcoal", name: "Charcoal", top: "#27272a", sub: "#18181b" },
];

export const NAVBAR_COLORS: NavbarTheme[] = [
  { key: "navy", name: "Navy", top: "#1c2b41", sub: "#101a2a" },
  { key: "blue", name: "Blue", top: "#0c66e4", sub: "#0055cc" },
  { key: "teal", name: "Teal", top: "#227d9b", sub: "#206a83" },
  { key: "green", name: "Green", top: "#216e4e", sub: "#164b35" },
  { key: "purple", name: "Purple", top: "#6e5dc6", sub: "#5e4db2" },
  { key: "pink", name: "Pink", top: "#ae4787", sub: "#943d73" },
  { key: "red", name: "Red", top: "#ae2e24", sub: "#8f231a" },
  { key: "orange", name: "Orange", top: "#a54800", sub: "#873800" },
];

export const NAVBAR_THEMES = [...NAVBAR_GREYS, ...NAVBAR_COLORS];

export const DEFAULT_APPEARANCE: Appearance = { background: BOARD_GRADIENTS[0].key, navbar: NAVBAR_GREYS[0].key };

// Okända eller saknade val (gammal eller ändrad localStorage) blir standard
export const normalizeAppearance = (raw: unknown): Appearance => {
  const value = (raw ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  const pick = (raw: unknown, presets: { key: string }[], fallback: string) =>
    isCustomColor(raw) ? raw.toLowerCase() : presets.some((p) => p.key === raw) ? (raw as string) : fallback;
  return {
    background: pick(value.background, BOARD_BACKGROUNDS, DEFAULT_APPEARANCE.background),
    navbar: pick(value.navbar, NAVBAR_THEMES, DEFAULT_APPEARANCE.navbar),
  };
};

// Egen färg: enfärgad bakgrund; navbarens text blir en ljus ton av den
const CUSTOM_TEXT_TINT = 0.6;
// Egen navbarfärg: raden under är så här mycket mörkare
const CUSTOM_SUB_SHADE = 0.25;

export const boardBackground = (value: string): BoardBackground =>
  isCustomColor(value)
    ? solid(value, "Custom", value, mixHex(value, "#ffffff", CUSTOM_TEXT_TINT))
    : (BOARD_BACKGROUNDS.find((b) => b.key === value) ?? BOARD_GRADIENTS[0]);

export const navbarTheme = (value: string): NavbarTheme =>
  isCustomColor(value)
    ? { key: value, name: "Custom", top: value, sub: mixHex(value, "#000000", CUSTOM_SUB_SHADE) }
    : (NAVBAR_THEMES.find((n) => n.key === value) ?? NAVBAR_GREYS[0]);

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
