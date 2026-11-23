import { sanitizeHexColor } from "./color";
import { interpolate, msg, type Translate } from "./i18n";

// A card's status = the key of a list. The lists are shared by everyone (GET /column) and
// admins can add more; keys like CardStatus in server-java
export type CardStatus = string;
// color: optional list colour (#rrggbb), shared; missing = the default colour
export type BoardHeader = { key: CardStatus; title: string; color?: string };
// status: the list's key (x is the list's index, which changes when an admin moves lists); missing in older layouts
export type SavedCardPosition = { id: string; x: number; y: number; w: number; h: number; status?: CardStatus };
export type CardPosition = { i: string; x: number; y: number; w: number; h: number };
export type BoardCard = { id: string; status?: string };

// The default lists (same as CardStatus.DEFAULT_COLUMNS in server-java); used
// until the lists have been fetched, and if fetching fails
export const DEFAULT_HEADERS: BoardHeader[] = [
  { key: "todo", title: msg("To Do") },
  { key: "in-progress", title: msg("In Progress") },
  { key: "test", title: msg("Test") },
  { key: "done", title: msg("Done") },
];

// The default lists keep their English title in the database and are shown translated; renamed and added
// lists are shown as typed
export const listTitle = (header: BoardHeader, t: Translate): string =>
  DEFAULT_HEADERS.some((d) => d.key === header.key && d.title === header.title) ? t(header.title) : header.title;

// The default list: new cards without a status land there, so it can't be deleted (DEFAULT_CARD_STATUS on the server)
export const DEFAULT_LIST_KEY: CardStatus = "todo";

// Admin: why a list can't be deleted, or null. Only empty lists (no cards with the list's status)
export const listDeleteBlocker = (
  key: CardStatus,
  cards: { status?: string }[],
  t: Translate = interpolate,
): string | null => {
  if (key === DEFAULT_LIST_KEY) return t(msg("Default list"));
  const count = cards.filter((c) => (c.status ?? DEFAULT_LIST_KEY) === key).length;
  if (!count) return null;
  return count === 1 ? t(msg("1 card")) : t(msg("{count} cards"), { count });
};

// Must match ResponsiveGridLayout so that the headers line up with the columns
export const GRID_MARGIN = 10;
export const HEADER_HEIGHT = 44;
export const ROW_HEIGHT = 150;
// The "Add a card" button under the header, above the cards
export const ADD_BUTTON_HEIGHT = 40;
// The cards start below the header and the button
export const CARDS_TOP = HEADER_HEIGHT + ADD_BUTTON_HEIGHT;
// Number of skeleton cards per list while the board loads
export const SKELETON_CARD_COUNT = 2;

// The list grows with its cards: header + button + cards (GRID_MARGIN of space below the last card)
export const listHeight = (rows: number): number =>
  CARDS_TOP + rows * (ROW_HEIGHT + GRID_MARGIN);

// The user's own layout: only the order of the cards within the lists
export type UserLayout = {
  cards?: SavedCardPosition[];
};

export const DEFAULT_LAYOUT: UserLayout = {};

// localStorage keys for the board's settings (per browser)
export const LAYOUT_STORAGE_KEY = "user_layout";
export const COLLAPSED_STORAGE_KEY = "collapsed_columns";

// Must match @Size on title in server-java ColumnRequest
export const HEADER_TITLE_MAX_LENGTH = 50;

const sanitizeTitle = (title: unknown): string =>
  typeof title === "string" ? title.trim().slice(0, HEADER_TITLE_MAX_LENGTH) : "";

// Default colour per list; same as --color-list-* in app/root.css
export const DEFAULT_LIST_COLORS: Record<CardStatus, string> = {
  todo: "#eed7fc",
  "in-progress": "#f5e989",
  test: "#cce0ff",
  done: "#baf3db",
};
// Lists added by admins, without their own colour; same as --color-jira-lane in app/root.css
export const NEW_LIST_COLOR = "#f1f2f4";

export const defaultListColor = (key: CardStatus): string => DEFAULT_LIST_COLORS[key] ?? NEW_LIST_COLOR;

// The colours in the colour picker: light Trello shades on top, darker below
export const LIST_SWATCHES: { name: string; color: string }[] = [
  { name: msg("Lavender"), color: "#eed7fc" },
  { name: msg("Yellow"), color: "#f5e989" },
  { name: msg("Light blue"), color: "#cce0ff" },
  { name: msg("Mint"), color: "#baf3db" },
  { name: msg("Pink"), color: "#fdd0ec" },
  { name: msg("Peach"), color: "#fedec8" },
  { name: msg("Rose"), color: "#ffd5d2" },
  { name: msg("Sky"), color: "#c6edfb" },
  { name: msg("Lime"), color: "#d3f1a7" },
  { name: msg("Light grey"), color: "#dcdfe4" },
  { name: msg("Purple"), color: "#6e5dc6" },
  { name: msg("Green"), color: "#1f845a" },
  { name: msg("Blue"), color: "#0c66e4" },
  { name: msg("Red"), color: "#c9372c" },
  { name: msg("Slate"), color: "#44546f" },
];

// Only the card positions are used; older layouts also have cols and headers
export const normalizeLayout = (raw: unknown): UserLayout => ({ cards: (raw as Partial<UserLayout> | null)?.cards });

// There is one layout per user, for every board they are on. When a board is saved its cards
// (boardCardIds) are replaced by next; positions of cards on other boards are kept
export const mergeBoardPositions = (
  saved: SavedCardPosition[] = [],
  next: SavedCardPosition[] = [],
  boardCardIds: ReadonlySet<string>,
): SavedCardPosition[] => {
  const nextIds = new Set(next.map((p) => p.id));
  return [...saved.filter((p) => !boardCardIds.has(p.id) && !nextIds.has(p.id)), ...next];
};

// List keys as the server makes them: lowercase letters and digits with hyphens
const COLUMN_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// The lists from GET /column: invalid ones and duplicates are dropped; none at all = the default lists
export const normalizeColumns = (raw: unknown): BoardHeader[] => {
  if (!Array.isArray(raw)) return DEFAULT_HEADERS;
  const headers: BoardHeader[] = [];
  for (const c of raw) {
    const key = c?.key;
    if (typeof key !== "string" || !COLUMN_KEY.test(key) || headers.some((h) => h.key === key)) continue;
    const color = sanitizeHexColor(c.color);
    headers.push({ key, title: sanitizeTitle(c.title) || key, ...(color ? { color } : {}) });
  }
  return headers.length ? headers : DEFAULT_HEADERS;
};

// An empty or unchanged name returns the same array, so nothing is saved
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

// null restores the default colour; an invalid or unchanged colour returns the same array
export const recolorHeader = (
  headers: BoardHeader[],
  key: CardStatus,
  color: string | null,
): BoardHeader[] => {
  const clean = color === null ? undefined : sanitizeHexColor(color);
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

// Older saved positions only have the list's index: give them the list's key before the lists move
export const withListKeys = (headers: BoardHeader[], saved: SavedCardPosition[] = []): SavedCardPosition[] =>
  saved.map((s) => (s.status === undefined ? { ...s, status: statusForColumn(headers, s.x) } : s));

// Admin: moves list `from` to the place of list `to`; the others keep their order
export const moveHeader = (headers: BoardHeader[], from: CardStatus, to: CardStatus): BoardHeader[] => {
  const fromIndex = headers.findIndex((h) => h.key === from);
  const toIndex = headers.findIndex((h) => h.key === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return headers;
  const next = headers.filter((h) => h.key !== from);
  next.splice(toIndex, 0, headers[fromIndex]);
  return next;
};

// An unknown or missing status (older cards) lands in the first list
export const columnForStatus = (headers: BoardHeader[], status?: string): number =>
  Math.max(0, headers.findIndex((h) => h.key === status));

export const statusForColumn = (headers: BoardHeader[], x: number): CardStatus =>
  headers[Math.min(Math.max(0, x), headers.length - 1)].key;

// Collapsed lists (saved per browser): unique strings. Keys of lists that
// don't exist do nothing, so the choice can be read before the lists are fetched
export const normalizeCollapsed = (raw: unknown): CardStatus[] =>
  Array.isArray(raw) ? [...new Set(raw.filter((k): k is string => typeof k === "string"))] : [];

export const toggleCollapsed = (collapsed: CardStatus[], key: CardStatus): CardStatus[] =>
  collapsed.includes(key) ? collapsed.filter((k) => k !== key) : [...collapsed, key];

export const isColumnCollapsed = (headers: BoardHeader[], collapsed: CardStatus[], x: number): boolean =>
  collapsed.includes(statusForColumn(headers, x));

// Cards in collapsed lists are taken out of the grid; their positions are still saved
export const splitByCollapsed = <T extends { x: number }>(
  headers: BoardHeader[],
  layout: readonly T[],
  collapsed: CardStatus[],
) => ({
  visible: layout.filter((l) => !isColumnCollapsed(headers, collapsed, l.x)),
  hidden: layout.filter((l) => isColumnCollapsed(headers, collapsed, l.x)),
});

// The grid is split into units: an expanded list is always EXPANDED_SPAN units wide,
// a hidden list one unit (a narrow strip, as in Trello). Hidden lists make the board
// narrower; the other lists don't get wider. Four expanded lists fill the screen on
// desktop; more lists scroll horizontally
export const BOARD_UNITS = 16;
export const LISTS_PER_SCREEN = 4;
export const EXPANDED_SPAN = BOARD_UNITS / LISTS_PER_SCREEN;
// The strip's maximum height; long names are cut off
export const COLLAPSED_LIST_MAX_HEIGHT = 280;

export type ColumnSpan = { start: number; span: number; collapsed: boolean };
export type BoardColumns = { spans: ColumnSpan[]; units: number; expandedSpan: number };

// extraUnits: space after the lists, e.g. for "Add new column"
export const boardColumns = (headers: BoardHeader[], collapsed: CardStatus[], extraUnits = 0): BoardColumns => {
  let start = 0;
  const spans = headers.map((h) => {
    const isCollapsed = collapsed.includes(h.key);
    const span = isCollapsed ? 1 : EXPANDED_SPAN;
    const col = { start, span, collapsed: isCollapsed };
    start += span;
    return col;
  });
  // units = the units in use; the rest of the board is empty
  return { spans, units: start + extraUnits, expandedSpan: EXPANDED_SPAN };
};

// The nearest expanded list for an x position in the grid. Cards don't snap to a strip;
// a card dropped on the strip (HIDDEN_LIST_ATTR) moves to the top of the hidden list
export const columnAtGridX = ({ spans }: BoardColumns, x: number): number =>
  spans.reduce(
    (best, s, i) =>
      !s.collapsed && (best < 0 || Math.abs(s.start - x) < Math.abs(spans[best].start - x)) ? i : best,
    -1,
  );

// The strip of a hidden list has this attribute with the list's key, so a dropped card can find it
export const HIDDEN_LIST_ATTR = "data-hidden-list";

// The pointer position in a mouse or touch event, e.g. when a card is dropped
export const eventPoint = (e: Event): { x: number; y: number } | null => {
  const { clientX, clientY } = e as MouseEvent;
  if (typeof clientX === "number") return { x: clientX, y: clientY };
  const touch = (e as TouchEvent).changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

export const snapGridX = (columns: BoardColumns, x: number): number =>
  columns.spans[Math.max(0, columnAtGridX(columns, x))].start;

// A dragged card lands in the list the pointer is over (index in the board's order, as when a list is dragged);
// over a strip: the nearest expanded list. Without a pointer (null): the card's own x position
export const cardDragGridX = (columns: BoardColumns, x: number, listIndex: number | null): number =>
  snapGridX(columns, listIndex === null || !columns.spans[listIndex] ? x : columns.spans[listIndex].start);

// List index → grid units and back
export const toGridLayout = <T extends { x: number; w: number }>(layout: readonly T[], columns: BoardColumns): T[] =>
  layout.map((l) => ({ ...l, x: columns.spans[l.x].start, w: columns.expandedSpan }));

export const fromGridLayout = <T extends { x: number; w: number }>(layout: readonly T[], columns: BoardColumns): T[] =>
  layout.map((l) => ({ ...l, x: Math.max(0, columnAtGridX(columns, l.x)), w: 1 }));

// Mobile: space between the list and the screen edge on both sides, so you can swipe up/down next to the cards
// (on the cards you drag them). Desktop uses GRID_MARGIN
export const MOBILE_GUTTER = 20;

// Mobile: an expanded list is the screen minus the gutter on both sides, a strip as many units as otherwise.
// With gutter g and n screens: n·100% − (n−1)·g, so the list snapped into view has g on both sides
export const mobileBoardWidth = ({ units, expandedSpan }: BoardColumns, gutter = MOBILE_GUTTER): string => {
  const screens = units / expandedSpan;
  return screens > 1 ? `calc(${screens * 100}% - ${(screens - 1) * gutter}px)` : `${screens * 100}%`;
};

// Minimum width of an expanded list on desktop (as in Trello); a strip is a quarter of it
export const MIN_LIST_WIDTH = 217;
const MIN_UNIT_WIDTH = MIN_LIST_WIDTH / EXPANDED_SPAN;

// Desktop: four expanded lists fill the screen; hidden lists make the board narrower.
// More lists share the screen width until they reach MIN_LIST_WIDTH, then the board scrolls
export const desktopBoardWidth = ({ units }: BoardColumns): string =>
  `max(${Math.min(units / BOARD_UNITS, 1) * 100}%, ${units * MIN_UNIT_WIDTH}px)`;

// Number of cards per column: shown in the header
export const countCardsPerColumn = (headers: BoardHeader[], layout: readonly { x: number }[]): number[] =>
  headers.map((_, i) => layout.filter((l) => l.x === i).length);

// Rows per list (sets the height); a collapsed list has no room for cards
export const rowsPerColumn = (counts: number[], { spans }: BoardColumns): number[] =>
  counts.map((count, i) => (spans[i]?.collapsed ? 0 : count));

// Every card is one column wide and one row high. The column comes from the card's
// status (shared by everyone). The order within the column comes from the user's
// saved positions (the list's key, or the index in older layouts); cards without a saved
// position in their column (new cards, or moved by someone else) land at the top,
// in the order they come (newest first).
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

  // Saved cards move down below the new ones; their relative order is kept
  return placed.map(({ id, x, y, top }) => ({
    i: id,
    x,
    y: y === null ? top : y + unsavedRows[x],
    w: 1,
    h: 1,
  }));
};

// Admin: move a list by dragging its header (useListDrag). The lists (and the strips) have
// LIST_KEY_ATTR; elements with NO_LIST_DRAG_ATTR (colour picker, hide button) start no drag
export const LIST_KEY_ATTR = "data-list-key";
export const NO_LIST_DRAG_ATTR = "data-no-list-drag";
// How far the mouse must move before it becomes a drag (otherwise a click)
export const LIST_DRAG_THRESHOLD_PX = 5;
// The lifted list tilts as in Trello
export const LIST_DRAG_TILT_DEG = 4;
// Near the board's edge it scrolls sideways, this much per frame
export const LIST_DRAG_EDGE_PX = 60;
export const LIST_DRAG_SCROLL_STEP_PX = 12;

// The slot (index in the board's order) under the pointer's x, otherwise the nearest one
// (pointer in the gap or outside the board). null without lists
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

// The order while a list is dragged: the lifted list in the slot the pointer is over
export const previewHeaders = (headers: BoardHeader[], from: CardStatus, toIndex: number | null): BoardHeader[] =>
  toIndex === null || !headers[toIndex] ? headers : moveHeader(headers, from, headers[toIndex].key);
