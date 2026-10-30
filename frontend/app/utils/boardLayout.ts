// Statusarna måste matcha CARD_STATUSES i server/utils/cardStatus.js
export type CardStatus = "todo" | "in-progress" | "test" | "done";
// color: valfri listfärg (#rrggbb) per användare; saknas = standardfärgen
export type BoardHeader = { key: CardStatus; title: string; color?: string };
export type SavedCardPosition = { id: string; x: number; y: number; w: number; h: number };
export type CardPosition = { i: string; x: number; y: number; w: number; h: number };
export type BoardCard = { id: string; status?: string };

export const DEFAULT_HEADERS: BoardHeader[] = [
  { key: "todo", title: "To Do" },
  { key: "in-progress", title: "In Progress" },
  { key: "test", title: "Test" },
  { key: "done", title: "Done" },
];

export const BOARD_COLS = DEFAULT_HEADERS.length;

// Måste matcha ResponsiveGridLayout så att rubrikerna linjerar med kolumnerna
export const GRID_MARGIN = 10;
export const HEADER_HEIGHT = 44;
export const ROW_HEIGHT = 150;
// "Add a card"-knappen längst ner i varje lista
export const FOOTER_HEIGHT = 44;

// Listan växer med korten, som i Trello: rubrik + kort + knapp
export const listHeight = (rows: number): number =>
  HEADER_HEIGHT + rows * (ROW_HEIGHT + GRID_MARGIN) + FOOTER_HEIGHT;

export type UserLayout = {
  cols: number;
  headers: BoardHeader[];
  cards?: SavedCardPosition[];
};

export const DEFAULT_LAYOUT: UserLayout = {
  cols: BOARD_COLS,
  headers: DEFAULT_HEADERS,
};

// Måste matcha HEADER_TITLE_MAX_LENGTH i server/controllers/userController.js
export const HEADER_TITLE_MAX_LENGTH = 50;

const sanitizeTitle = (title: unknown): string =>
  typeof title === "string" ? title.trim().slice(0, HEADER_TITLE_MAX_LENGTH) : "";

// Måste matcha HEX_COLOR i server/controllers/userController.js
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const sanitizeColor = (color: unknown): string | undefined =>
  typeof color === "string" && HEX_COLOR.test(color) ? color.toLowerCase() : undefined;

// Standardfärg per lista; samma som --color-list-* i app/root.css
export const DEFAULT_LIST_COLORS: Record<CardStatus, string> = {
  todo: "#eed7fc",
  "in-progress": "#f5e989",
  test: "#cce0ff",
  done: "#baf3db",
};

// Färgerna i färgväljaren: ljusa Trello-toner överst, mörkare under
export const LIST_SWATCHES: { name: string; color: string }[] = [
  { name: "Lavender", color: "#eed7fc" },
  { name: "Yellow", color: "#f5e989" },
  { name: "Light blue", color: "#cce0ff" },
  { name: "Mint", color: "#baf3db" },
  { name: "Pink", color: "#fdd0ec" },
  { name: "Peach", color: "#fedec8" },
  { name: "Rose", color: "#ffd5d2" },
  { name: "Sky", color: "#c6edfb" },
  { name: "Lime", color: "#d3f1a7" },
  { name: "Light grey", color: "#dcdfe4" },
  { name: "Purple", color: "#6e5dc6" },
  { name: "Green", color: "#1f845a" },
  { name: "Blue", color: "#0c66e4" },
  { name: "Red", color: "#c9372c" },
  { name: "Slate", color: "#44546f" },
];

// Relativ luminans enligt WCAG
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const DARK_TEXT = "#172b4d";
const LIGHT_TEXT = "#ffffff";

// WCAG-kontrast mellan två färger, 1–21
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Mörk eller vit text, den som ger högst kontrast mot listfärgen
export const readableTextColor = (background: string): string =>
  contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;

// Boarden har alltid de fyra fasta kolumnerna; användaren kan byta namn på
// dem, och kortpositioner sparas
export const normalizeLayout = (raw: Partial<UserLayout>): UserLayout => ({
  ...DEFAULT_LAYOUT,
  headers: DEFAULT_HEADERS.map((h) => {
    const saved = raw.headers?.find((s) => s?.key === h.key);
    const color = sanitizeColor(saved?.color);
    return { key: h.key, title: sanitizeTitle(saved?.title) || h.title, ...(color ? { color } : {}) };
  }),
  cards: raw.cards,
});

// Tomt eller oförändrat namn returnerar samma array, så inget sparas
export const renameHeader = (
  headers: BoardHeader[],
  key: CardStatus,
  title: string,
): BoardHeader[] => {
  const clean = sanitizeTitle(title);
  const current = headers.find((h) => h.key === key);
  if (!clean || !current || current.title === clean) return headers;
  return headers.map((h) => (h.key === key ? { ...h, title: clean } : h));
};

// null återställer standardfärgen; ogiltig eller oförändrad färg returnerar samma array
export const recolorHeader = (
  headers: BoardHeader[],
  key: CardStatus,
  color: string | null,
): BoardHeader[] => {
  const clean = color === null ? undefined : sanitizeColor(color);
  const current = headers.find((h) => h.key === key);
  if ((color !== null && !clean) || !current || current.color === clean) return headers;
  return headers.map((h) => {
    if (h.key !== key) return h;
    const { color: _old, ...rest } = h;
    return clean ? { ...rest, color: clean } : rest;
  });
};

export const cardKey = (card: { _id?: string }, index: number): string =>
  card._id || String(index);

export const toSavedPositions = (layout: readonly CardPosition[]): SavedCardPosition[] =>
  layout.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));

// Okänd eller saknad status (äldre kort) hamnar i To Do
export const columnForStatus = (status?: string): number =>
  Math.max(0, DEFAULT_HEADERS.findIndex((h) => h.key === status));

export const statusForColumn = (x: number): CardStatus =>
  DEFAULT_HEADERS[Math.min(Math.max(0, x), BOARD_COLS - 1)].key;

// Ihopfällda listor (sparas per webbläsare); okända värden och dubbletter tas bort
export const normalizeCollapsed = (raw: unknown): CardStatus[] =>
  Array.isArray(raw) ? DEFAULT_HEADERS.map((h) => h.key).filter((k) => raw.includes(k)) : [];

export const toggleCollapsed = (collapsed: CardStatus[], key: CardStatus): CardStatus[] =>
  collapsed.includes(key) ? collapsed.filter((k) => k !== key) : [...collapsed, key];

export const isColumnCollapsed = (collapsed: CardStatus[], x: number): boolean =>
  collapsed.includes(statusForColumn(x));

// Kort i ihopfällda listor tas bort ur gridden; deras positioner sparas ändå
export const splitByCollapsed = <T extends { x: number }>(layout: readonly T[], collapsed: CardStatus[]) => ({
  visible: layout.filter((l) => !isColumnCollapsed(collapsed, l.x)),
  hidden: layout.filter((l) => isColumnCollapsed(collapsed, l.x)),
});

// Antal kort per kolumn: visas i rubriken
export const countCardsPerColumn = (layout: readonly { x: number }[]): number[] =>
  DEFAULT_HEADERS.map((_, i) => layout.filter((l) => l.x === i).length);

// Rader per lista (styr höjden); en ihopfälld lista har ingen plats för kort
export const rowsPerColumn = (counts: number[], collapsed: CardStatus[]): number[] =>
  counts.map((count, i) => (isColumnCollapsed(collapsed, i) ? 0 : count));

// Varje kort är en kolumn brett och en rad högt. Kolumnen kommer från kortets
// status (delad av alla). Ordningen inom kolumnen kommer från användarens
// sparade positioner; kort utan sparad position i sin kolumn hamnar sist.
export const buildCardLayout = (
  cards: BoardCard[],
  saved: SavedCardPosition[] = [],
): CardPosition[] => {
  const byId = new Map(saved.map((s) => [s.id, s]));
  const nextRow = new Array<number>(BOARD_COLS).fill(0);

  const placed = cards.map(({ id, status }) => {
    const x = columnForStatus(status);
    const pos = byId.get(id);
    const y = pos && pos.x === x ? pos.y : null;
    if (y !== null) nextRow[x] = Math.max(nextRow[x], y + 1);
    return { id, x, y };
  });

  return placed.map(({ id, x, y }) => ({ i: id, x, y: y ?? nextRow[x]++, w: 1, h: 1 }));
};
