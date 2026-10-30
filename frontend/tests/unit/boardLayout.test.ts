import { describe, expect, it } from "@jest/globals";
import {
  BOARD_COLS,
  DEFAULT_HEADERS,
  DEFAULT_LAYOUT,
  FOOTER_HEIGHT,
  GRID_MARGIN,
  HEADER_HEIGHT,
  HEADER_TITLE_MAX_LENGTH,
  LIST_SWATCHES,
  contrastRatio,
  ROW_HEIGHT,
  buildCardLayout,
  cardKey,
  listHeight,
  columnForStatus,
  countCardsPerColumn,
  isColumnCollapsed,
  normalizeCollapsed,
  normalizeLayout,
  toggleCollapsed,
  readableTextColor,
  recolorHeader,
  renameHeader,
  rowsPerColumn,
  splitByCollapsed,
  statusForColumn,
  toSavedPositions,
} from "../../app/utils/boardLayout";

describe("normalizeLayout", () => {
  it("always uses the fixed columns and keeps only saved card positions", () => {
    const cards = [{ id: "a", x: 1, y: 0, w: 1, h: 1 }];
    expect(normalizeLayout({ cols: 12, headers: [], cards })).toEqual({ ...DEFAULT_LAYOUT, cards });
    expect(normalizeLayout({})).toEqual({ ...DEFAULT_LAYOUT, cards: undefined });
  });

  it("keeps renamed titles for known columns and ignores the rest", () => {
    const headers = [
      { key: "done", title: " Shipped " },
      { key: "test", title: "   " },
      { key: "archived", title: "Archive" },
    ] as any;
    expect(normalizeLayout({ headers }).headers).toEqual([
      { key: "todo", title: "To Do" },
      { key: "in-progress", title: "In Progress" },
      { key: "test", title: "Test" },
      { key: "done", title: "Shipped" },
    ]);
  });

  it("keeps valid column colors, lowercased, and drops invalid ones", () => {
    const headers = [
      { key: "todo", title: "To Do", color: "#FDD0EC" },
      { key: "test", title: "Test", color: "red" },
      { key: "done", title: "Done", color: null },
    ] as any;
    const result = normalizeLayout({ headers }).headers;
    expect(result[0]).toEqual({ key: "todo", title: "To Do", color: "#fdd0ec" });
    expect(result[2]).not.toHaveProperty("color");
    expect(result[3]).not.toHaveProperty("color");
  });
});

describe("recolorHeader", () => {
  it("sets one column's color, lowercased", () => {
    const recolored = recolorHeader(DEFAULT_HEADERS, "test", "#1F845A");
    expect(recolored[2]).toEqual({ key: "test", title: "Test", color: "#1f845a" });
    expect(recolored.filter((h) => h.key !== "test")).toEqual(DEFAULT_HEADERS.filter((h) => h.key !== "test"));
  });

  it("removes the color on reset", () => {
    const colored = recolorHeader(DEFAULT_HEADERS, "todo", "#fdd0ec");
    expect(recolorHeader(colored, "todo", null)[0]).toEqual({ key: "todo", title: "To Do" });
  });

  it("returns the same array for an invalid, unchanged or no-op color", () => {
    const colored = recolorHeader(DEFAULT_HEADERS, "todo", "#fdd0ec");
    expect(recolorHeader(colored, "todo", "#FDD0EC")).toBe(colored);
    expect(recolorHeader(colored, "todo", "pink")).toBe(colored);
    expect(recolorHeader(DEFAULT_HEADERS, "todo", null)).toBe(DEFAULT_HEADERS);
  });
});

describe("readableTextColor", () => {
  it("uses dark text on light colors and white on dark ones", () => {
    expect(readableTextColor("#eed7fc")).toBe("#172b4d");
    expect(readableTextColor("#ffffff")).toBe("#172b4d");
    expect(readableTextColor("#0c66e4")).toBe("#ffffff");
    expect(readableTextColor("#000000")).toBe("#ffffff");
  });

  it("gives every swatch a readable text color (contrast at least 4.5:1)", () => {
    for (const { color } of LIST_SWATCHES) {
      expect(contrastRatio(color, readableTextColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("renameHeader", () => {
  it("renames one column, trimmed and capped in length", () => {
    const renamed = renameHeader(DEFAULT_HEADERS, "todo", `  ${"B".repeat(60)} `);
    expect(renamed[0]).toEqual({ key: "todo", title: "B".repeat(HEADER_TITLE_MAX_LENGTH) });
    expect(renamed.slice(1)).toEqual(DEFAULT_HEADERS.slice(1));
  });

  it("returns the same array for an empty or unchanged title", () => {
    expect(renameHeader(DEFAULT_HEADERS, "todo", "  ")).toBe(DEFAULT_HEADERS);
    expect(renameHeader(DEFAULT_HEADERS, "todo", "To Do")).toBe(DEFAULT_HEADERS);
  });
});

describe("cardKey", () => {
  it("uses the id, or the index for cards without one", () => {
    expect(cardKey({ _id: "abc" }, 3)).toBe("abc");
    expect(cardKey({}, 3)).toBe("3");
  });
});

describe("toSavedPositions", () => {
  it("maps grid items to saved positions", () => {
    expect(toSavedPositions([{ i: "a", x: 2, y: 1, w: 1, h: 1 }])).toEqual([
      { id: "a", x: 2, y: 1, w: 1, h: 1 },
    ]);
  });
});

describe("DEFAULT_HEADERS", () => {
  it("is To Do, In Progress, Test, Done", () => {
    expect(DEFAULT_HEADERS.map((h) => h.title)).toEqual([
      "To Do",
      "In Progress",
      "Test",
      "Done",
    ]);
    expect(BOARD_COLS).toBe(4);
  });

  it("uses the backend status keys", () => {
    expect(DEFAULT_HEADERS.map((h) => h.key)).toEqual(["todo", "in-progress", "test", "done"]);
  });
});

describe("columnForStatus / statusForColumn", () => {
  it("maps each status to its column and back", () => {
    DEFAULT_HEADERS.forEach((h, i) => {
      expect(columnForStatus(h.key)).toBe(i);
      expect(statusForColumn(i)).toBe(h.key);
    });
  });

  it("puts cards without a known status in To Do", () => {
    expect(columnForStatus(undefined)).toBe(0);
    expect(columnForStatus("archived")).toBe(0);
  });

  it("clamps out-of-range columns", () => {
    expect(statusForColumn(-1)).toBe("todo");
    expect(statusForColumn(9)).toBe("done");
  });
});

describe("buildCardLayout", () => {
  it("places cards in the column of their status, one cell each", () => {
    expect(
      buildCardLayout([
        { id: "a" },
        { id: "b", status: "test" },
        { id: "c", status: "todo" },
      ]),
    ).toEqual([
      { i: "a", x: 0, y: 0, w: 1, h: 1 },
      { i: "b", x: 2, y: 0, w: 1, h: 1 },
      { i: "c", x: 0, y: 1, w: 1, h: 1 },
    ]);
  });

  it("keeps the saved row when the saved column matches the status", () => {
    const saved = [{ id: "a", x: 3, y: 4, w: 3, h: 2 }];
    expect(buildCardLayout([{ id: "a", status: "done" }], saved)).toEqual([
      { i: "a", x: 3, y: 4, w: 1, h: 1 },
    ]);
  });

  it("follows the status when someone else moved the card", () => {
    const saved = [{ id: "a", x: 0, y: 2, w: 1, h: 1 }];
    expect(buildCardLayout([{ id: "a", status: "in-progress" }], saved)).toEqual([
      { i: "a", x: 1, y: 0, w: 1, h: 1 },
    ]);
  });

  it("places cards without a saved row below the saved ones in their column", () => {
    const saved = [{ id: "a", x: 0, y: 2, w: 1, h: 1 }];
    expect(buildCardLayout([{ id: "new" }, { id: "a" }], saved)[0]).toEqual({
      i: "new",
      x: 0,
      y: 3,
      w: 1,
      h: 1,
    });
  });
});

describe("listHeight", () => {
  it("fits the header, one row per card and the add button", () => {
    expect(listHeight(0)).toBe(HEADER_HEIGHT + FOOTER_HEIGHT);
    expect(listHeight(2)).toBe(listHeight(0) + 2 * (ROW_HEIGHT + GRID_MARGIN));
  });
});

describe("collapsed columns", () => {
  it("keeps only known statuses, in board order, without duplicates", () => {
    expect(normalizeCollapsed(["done", "nope", "todo", "done", 3])).toEqual(["todo", "done"]);
    expect(normalizeCollapsed("todo")).toEqual([]);
    expect(normalizeCollapsed(null)).toEqual([]);
  });

  it("toggles a column in and out", () => {
    expect(toggleCollapsed([], "test")).toEqual(["test"]);
    expect(toggleCollapsed(["todo", "test"], "test")).toEqual(["todo"]);
  });

  it("checks a grid column against the collapsed statuses", () => {
    expect(isColumnCollapsed(["test"], columnForStatus("test"))).toBe(true);
    expect(isColumnCollapsed(["test"], columnForStatus("done"))).toBe(false);
  });
});

describe("column helpers", () => {
  const layout = [
    { i: "a", x: 0, y: 0, w: 1, h: 1 },
    { i: "b", x: 0, y: 1, w: 1, h: 1 },
    { i: "c", x: 2, y: 0, w: 1, h: 1 },
  ];

  it("counts cards per column", () => {
    expect(countCardsPerColumn(layout)).toEqual([2, 0, 1, 0]);
  });

  it("gives a collapsed list no rows", () => {
    expect(rowsPerColumn([2, 0, 1, 0], ["todo"])).toEqual([0, 0, 1, 0]);
  });

  it("splits out cards in collapsed lists", () => {
    const { visible, hidden } = splitByCollapsed(layout, ["todo"]);

    expect(visible.map((l) => l.i)).toEqual(["c"]);
    expect(hidden.map((l) => l.i)).toEqual(["a", "b"]);
  });
});
