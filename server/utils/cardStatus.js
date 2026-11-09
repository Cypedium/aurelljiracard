// server/utils/cardStatus.js
// A card's status is the key of a board column (shared, stored in models/Column.js) or the backlog.
// Default columns, seeded when there are none; must match DEFAULT_HEADERS in
// frontend/app/utils/boardLayout.ts and server-java V6__board_columns.sql
const DEFAULT_COLUMNS = [
  { key: "todo", title: "To Do" },
  { key: "in-progress", title: "In Progress" },
  { key: "test", title: "Test" },
  { key: "done", title: "Done" }
];
// Backlog cards are not on the board and have no assignee; must match frontend/app/utils/backlog.ts
const BACKLOG_STATUS = "backlog";

// Column keys: lowercase letters and digits joined by single hyphens, e.g. "in-progress"
const COLUMN_KEY_MAX_LENGTH = 32;
const COLUMN_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Room for a "-NN" suffix when two lists get the same name
const COLUMN_KEY_BASE_LENGTH = 24;

const isColumnKey = (value) =>
  typeof value === "string" &&
  value.length <= COLUMN_KEY_MAX_LENGTH &&
  COLUMN_KEY_PATTERN.test(value) &&
  value !== BACKLOG_STATUS;

// "Code review" → "code-review"; å/ä/ö lose their accents; nothing left → fallback
const slugify = (title, fallback) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, COLUMN_KEY_BASE_LENGTH)
    .replace(/-+$/, "") || fallback;

// A key made from a name, unique among the taken keys ("done" taken → "done-2").
// Also used for issue type keys (utils/cardType.js)
const uniqueKeyFromTitle = (title, takenKeys, fallback) => {
  const taken = new Set(takenKeys);
  const base = slugify(title, fallback);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const key = `${base}-${n}`;
    if (!taken.has(key)) return key;
  }
};

// A new column's key, unique among the taken keys (and never "backlog")
const columnKeyFromTitle = (title, takenKeys) => uniqueKeyFromTitle(title, [...takenKeys, BACKLOG_STATUS], "list");

exports.DEFAULT_COLUMNS = DEFAULT_COLUMNS;
exports.BACKLOG_STATUS = BACKLOG_STATUS;
exports.DEFAULT_CARD_STATUS = "todo";
exports.isColumnKey = isColumnKey;
exports.columnKeyFromTitle = columnKeyFromTitle;
exports.uniqueKeyFromTitle = uniqueKeyFromTitle;
