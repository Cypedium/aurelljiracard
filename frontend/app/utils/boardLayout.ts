// Ett korts status = nyckeln till en lista. Listorna delas av alla (GET /column) och
// admins kan lägga till fler; nycklar som i server/utils/cardStatus.js
export type CardStatus = string;
// color: valfri listfärg (#rrggbb), delad; saknas = standardfärgen
export type BoardHeader = { key: CardStatus; title: string; color?: string };
// status: listans key (x är listans index, som ändras när en admin flyttar listor); saknas i äldre layouter
export type SavedCardPosition = { id: string; x: number; y: number; w: number; h: number; status?: CardStatus };
export type CardPosition = { i: string; x: number; y: number; w: number; h: number };
export type BoardCard = { id: string; status?: string };

// Standardlistorna (samma som DEFAULT_COLUMNS i server/utils/cardStatus.js); används
// tills listorna hämtats och om hämtningen misslyckas
export const DEFAULT_HEADERS: BoardHeader[] = [
  { key: "todo", title: "To Do" },
  { key: "in-progress", title: "In Progress" },
  { key: "test", title: "Test" },
  { key: "done", title: "Done" },
];

// Måste matcha ResponsiveGridLayout så att rubrikerna linjerar med kolumnerna
export const GRID_MARGIN = 10;
export const HEADER_HEIGHT = 44;
export const ROW_HEIGHT = 150;
// "Add a card"-knappen under rubriken, ovanför korten
export const ADD_BUTTON_HEIGHT = 40;
// Korten börjar under rubrik och knapp
export const CARDS_TOP = HEADER_HEIGHT + ADD_BUTTON_HEIGHT;
// Antal skeleton-kort per lista medan boarden laddas
export const SKELETON_CARD_COUNT = 2;

// Listan växer med korten: rubrik + knapp + kort (GRID_MARGIN luft under sista kortet)
export const listHeight = (rows: number): number =>
  CARDS_TOP + rows * (ROW_HEIGHT + GRID_MARGIN);

// Användarens egen layout: bara kortens ordning inom listorna
export type UserLayout = {
  cards?: SavedCardPosition[];
};

export const DEFAULT_LAYOUT: UserLayout = {};

// localStorage-nycklar för boardens inställningar (per webbläsare)
export const LAYOUT_STORAGE_KEY = "user_layout";
export const COLLAPSED_STORAGE_KEY = "collapsed_columns";

// Måste matcha TITLE_MAX_LENGTH i server/controllers/columnController.js
export const HEADER_TITLE_MAX_LENGTH = 50;

const sanitizeTitle = (title: unknown): string =>
  typeof title === "string" ? title.trim().slice(0, HEADER_TITLE_MAX_LENGTH) : "";

// Måste matcha HEX_COLOR i server/controllers/columnController.js
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
// Listor som admins lagt till, utan egen färg; samma som --color-jira-lane i app/root.css
export const NEW_LIST_COLOR = "#f1f2f4";

export const defaultListColor = (key: CardStatus): string => DEFAULT_LIST_COLORS[key] ?? NEW_LIST_COLOR;

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

// Bara kortpositionerna används; äldre layouter har även cols och headers
export const normalizeLayout = (raw: Partial<UserLayout>): UserLayout => ({ cards: raw.cards });

// Listnycklar som servern skapar dem: små bokstäver och siffror med bindestreck
const COLUMN_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Listorna från GET /column: ogiltiga och dubbletter tas bort; inga alls = standardlistorna
export const normalizeColumns = (raw: unknown): BoardHeader[] => {
  if (!Array.isArray(raw)) return DEFAULT_HEADERS;
  const headers: BoardHeader[] = [];
  for (const c of raw) {
    const key = c?.key;
    if (typeof key !== "string" || !COLUMN_KEY.test(key) || headers.some((h) => h.key === key)) continue;
    const color = sanitizeColor(c.color);
    headers.push({ key, title: sanitizeTitle(c.title) || key, ...(color ? { color } : {}) });
  }
  return headers.length ? headers : DEFAULT_HEADERS;
};

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

export const toSavedPositions = (headers: BoardHeader[], layout: readonly CardPosition[]): SavedCardPosition[] =>
  layout.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h, status: statusForColumn(headers, l.x) }));

// Äldre sparade positioner har bara listans index: ge dem listans key innan listorna flyttas
export const withListKeys = (headers: BoardHeader[], saved: SavedCardPosition[] = []): SavedCardPosition[] =>
  saved.map((s) => (s.status === undefined ? { ...s, status: statusForColumn(headers, s.x) } : s));

// Admin: flyttar listan from till listan to:s plats; de andra behåller sin ordning
export const moveHeader = (headers: BoardHeader[], from: CardStatus, to: CardStatus): BoardHeader[] => {
  const fromIndex = headers.findIndex((h) => h.key === from);
  const toIndex = headers.findIndex((h) => h.key === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return headers;
  const next = headers.filter((h) => h.key !== from);
  next.splice(toIndex, 0, headers[fromIndex]);
  return next;
};

// Okänd eller saknad status (äldre kort) hamnar i första listan
export const columnForStatus = (headers: BoardHeader[], status?: string): number =>
  Math.max(0, headers.findIndex((h) => h.key === status));

export const statusForColumn = (headers: BoardHeader[], x: number): CardStatus =>
  headers[Math.min(Math.max(0, x), headers.length - 1)].key;

// Ihopfällda listor (sparas per webbläsare): unika strängar. Nycklar till listor som
// inte finns gör ingenting, så valet kan läsas innan listorna hämtats
export const normalizeCollapsed = (raw: unknown): CardStatus[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((k): k is string => typeof k === "string"))] : [];

export const toggleCollapsed = (collapsed: CardStatus[], key: CardStatus): CardStatus[] =>
  collapsed.includes(key) ? collapsed.filter((k) => k !== key) : [...collapsed, key];

export const isColumnCollapsed = (headers: BoardHeader[], collapsed: CardStatus[], x: number): boolean =>
  collapsed.includes(statusForColumn(headers, x));

// Kort i ihopfällda listor tas bort ur gridden; deras positioner sparas ändå
export const splitByCollapsed = <T extends { x: number }>(
  headers: BoardHeader[],
  layout: readonly T[],
  collapsed: CardStatus[],
) => ({
  visible: layout.filter((l) => !isColumnCollapsed(headers, collapsed, l.x)),
  hidden: layout.filter((l) => isColumnCollapsed(headers, collapsed, l.x)),
});

// Gridden delas i enheter: en utfälld lista är alltid EXPANDED_SPAN enheter bred,
// en dold lista en enhet (en smal remsa, som i Trello). Dolda listor gör boarden
// smalare; de andra listorna breddas inte. Fyra utfällda listor fyller skärmen på
// desktop; fler listor ger horisontell scroll
export const BOARD_UNITS = 16;
export const LISTS_PER_SCREEN = 4;
export const EXPANDED_SPAN = BOARD_UNITS / LISTS_PER_SCREEN;
// Remsans högsta höjd; långa namn kortas av
export const COLLAPSED_LIST_MAX_HEIGHT = 280;

export type ColumnSpan = { start: number; span: number; collapsed: boolean };
export type BoardColumns = { spans: ColumnSpan[]; units: number; expandedSpan: number };

// extraUnits: plats efter listorna, t.ex. för "Add new column"
export const boardColumns = (headers: BoardHeader[], collapsed: CardStatus[], extraUnits = 0): BoardColumns => {
  let start = 0;
  const spans = headers.map((h) => {
    const isCollapsed = collapsed.includes(h.key);
    const span = isCollapsed ? 1 : EXPANDED_SPAN;
    const col = { start, span, collapsed: isCollapsed };
    start += span;
    return col;
  });
  // units = de enheter som används; resten av boarden är tom
  return { spans, units: start + extraUnits, expandedSpan: EXPANDED_SPAN };
};

// Närmaste utfällda lista för en x-position i gridden. Kort snäpper inte till en remsa;
// släpps ett kort på remsan (HIDDEN_LIST_ATTR) flyttas det överst i den dolda listan
export const columnAtGridX = ({ spans }: BoardColumns, x: number): number =>
  spans.reduce(
    (best, s, i) =>
      !s.collapsed && (best < 0 || Math.abs(s.start - x) < Math.abs(spans[best].start - x)) ? i : best,
    -1,
  );

// Remsan för en dold lista har detta attribut med listans key, så att ett släppt kort hittar den
export const HIDDEN_LIST_ATTR = "data-hidden-list";

// Pekarens position i ett mus- eller touch-event, t.ex. när ett kort släpps
export const eventPoint = (e: Event): { x: number; y: number } | null => {
  const { clientX, clientY } = e as MouseEvent;
  if (typeof clientX === "number") return { x: clientX, y: clientY };
  const touch = (e as TouchEvent).changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

export const snapGridX = (columns: BoardColumns, x: number): number =>
  columns.spans[Math.max(0, columnAtGridX(columns, x))].start;

// Listindex → grid-enheter och tillbaka
export const toGridLayout = <T extends { x: number; w: number }>(layout: readonly T[], columns: BoardColumns): T[] =>
  layout.map((l) => ({ ...l, x: columns.spans[l.x].start, w: columns.expandedSpan }));

export const fromGridLayout = <T extends { x: number; w: number }>(layout: readonly T[], columns: BoardColumns): T[] =>
  layout.map((l) => ({ ...l, x: Math.max(0, columnAtGridX(columns, l.x)), w: 1 }));

// Mobil: en utfälld lista är en skärm bred, en remsa lika många enheter som annars
export const mobileBoardWidth = ({ units, expandedSpan }: BoardColumns): string =>
  `${(units / expandedSpan) * 100}%`;

// Minsta bredd för en utfälld lista på desktop (som Trello); en remsa är en fjärdedel
export const MIN_LIST_WIDTH = 217;
const MIN_UNIT_WIDTH = MIN_LIST_WIDTH / EXPANDED_SPAN;

// Desktop: fyra utfällda listor fyller skärmen; dolda listor gör boarden smalare.
// Fler listor delar på skärmens bredd tills de når MIN_LIST_WIDTH, sedan scrollar boarden
export const desktopBoardWidth = ({ units }: BoardColumns): string =>
  `max(${Math.min(units / BOARD_UNITS, 1) * 100}%, ${units * MIN_UNIT_WIDTH}px)`;

// Antal kort per kolumn: visas i rubriken
export const countCardsPerColumn = (headers: BoardHeader[], layout: readonly { x: number }[]): number[] =>
  headers.map((_, i) => layout.filter((l) => l.x === i).length);

// Rader per lista (styr höjden); en ihopfälld lista har ingen plats för kort
export const rowsPerColumn = (counts: number[], { spans }: BoardColumns): number[] =>
  counts.map((count, i) => (spans[i]?.collapsed ? 0 : count));

// Varje kort är en kolumn brett och en rad högt. Kolumnen kommer från kortets
// status (delad av alla). Ordningen inom kolumnen kommer från användarens
// sparade positioner (listans key, eller index i äldre layouter); kort utan sparad
// position i sin kolumn (nya kort, eller flyttade av någon annan) hamnar överst,
// i den ordning de kommer (nyast först).
export const buildCardLayout = (
  headers: BoardHeader[],
  cards: BoardCard[],
  saved: SavedCardPosition[] = [],
): CardPosition[] => {
  const byId = new Map(saved.map((s) => [s.id, s]));
  const unsavedRows = new Array<number>(headers.length).fill(0);

  const placed = cards.map(({ id, status }) => {
    const x = columnForStatus(headers, status);
    const pos = byId.get(id);
    const inThisList = pos && (pos.status !== undefined ? pos.status === headers[x].key : pos.x === x);
    const y = inThisList ? pos.y : null;
    return { id, x, y, top: y === null ? unsavedRows[x]++ : 0 };
  });

  // Sparade kort flyttas ner under de nya; inbördes ordning behålls
  return placed.map(({ id, x, y, top }) => ({
    i: id,
    x,
    y: y === null ? top : y + unsavedRows[x],
    w: 1,
    h: 1,
  }));
};

// Admin: flytta en lista genom att dra rubriken (useListDrag). Listorna (och remsorna) har
// LIST_KEY_ATTR; element med NO_LIST_DRAG_ATTR (färgväljare, dölj-knapp) startar ingen dragning
export const LIST_KEY_ATTR = "data-list-key";
export const NO_LIST_DRAG_ATTR = "data-no-list-drag";
// Så långt musen måste röra sig innan det blir en dragning (annars ett klick)
export const LIST_DRAG_THRESHOLD_PX = 5;
// Den lyfta listan lutar som i Trello
export const LIST_DRAG_TILT_DEG = 4;
// Nära boardens kant scrollar den i sidled, så här mycket per bildruta
export const LIST_DRAG_EDGE_PX = 60;
export const LIST_DRAG_SCROLL_STEP_PX = 12;

// Platsen (index i boardens ordning) under pekarens x, annars den närmaste
// (pekaren i mellanrummet eller utanför boarden). null utan listor
export const nearestListIndexAtX = (lists: readonly { left: number; right: number }[], x: number): number | null => {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const [index, { left, right }] of lists.entries()) {
    const distance = x < left ? left - x : x > right ? x - right : 0;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
};

// Ordningen medan en lista dras: den lyfta listan på platsen pekaren är över
export const previewHeaders = (headers: BoardHeader[], from: CardStatus, toIndex: number | null): BoardHeader[] =>
  toIndex === null || !headers[toIndex] ? headers : moveHeader(headers, from, headers[toIndex].key);
