// Statusarna måste matcha CARD_STATUSES i server/utils/cardStatus.js
export type CardStatus = "todo" | "in-progress" | "test" | "done";
export type BoardHeader = { key: CardStatus; title: string };
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

// Boarden har alltid de fyra fasta kolumnerna, bara kortpositioner sparas
export const normalizeLayout = (raw: Partial<UserLayout>): UserLayout => ({
  ...DEFAULT_LAYOUT,
  cards: raw.cards,
});

export const cardKey = (card: { _id?: string }, index: number): string =>
  card._id || String(index);

export const toSavedPositions = (layout: readonly CardPosition[]): SavedCardPosition[] =>
  layout.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));

// Okänd eller saknad status (äldre kort) hamnar i To Do
export const columnForStatus = (status?: string): number =>
  Math.max(0, DEFAULT_HEADERS.findIndex((h) => h.key === status));

export const statusForColumn = (x: number): CardStatus =>
  DEFAULT_HEADERS[Math.min(Math.max(0, x), BOARD_COLS - 1)].key;

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
