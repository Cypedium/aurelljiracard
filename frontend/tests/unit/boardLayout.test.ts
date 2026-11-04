import { describe, expect, it } from "@jest/globals";
import {
  BOARD_UNITS,
  DEFAULT_HEADERS,
  EXPANDED_SPAN,
  NEW_LIST_COLOR,
  defaultListColor,
  normalizeColumns,
  boardColumns,
  desktopBoardWidth,
  columnAtGridX,
  fromGridLayout,
  mobileBoardWidth,
  snapGridX,
  toGridLayout,
  DEFAULT_LAYOUT,
  ADD_BUTTON_HEIGHT,
  CARDS_TOP,
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

const H = DEFAULT_HEADERS;
// Standardlistorna plus en som en admin lagt till
const WITH_REVIEW = [...DEFAULT_HEADERS, { key: "review", title: "Review" }];

describe("normalizeLayout", () => {
  it("keeps only saved card positions; older layouts also have cols and headers", () => {
    const cards = [{ id: "a", x: 1, y: 0, w: 1, h: 1 }];
    expect(normalizeLayout({ cols: 12, headers: [], cards } as any)).toEqual({ ...DEFAULT_LAYOUT, cards });
    expect(normalizeLayout({})).toEqual({ ...DEFAULT_LAYOUT, cards: undefined });
  });
});

describe("normalizeColumns", () => {
  it("keeps the shared lists in order, including added ones", () => {
    const raw = [
      { key: "todo", title: "To Do", color: null, position: 0 },
      { key: "review", title: " Review ", color: "#FDD0EC", position: 4 },
    ];
    expect(normalizeColumns(raw)).toEqual([
      { key: "todo", title: "To Do" },
      { key: "review", title: "Review", color: "#fdd0ec" },
    ]);
  });

  it("drops invalid keys and duplicates, and falls back to the key as title", () => {
    const raw = [
      { key: "todo", title: "   " },
      { key: "todo", title: "Again" },
      { key: "Not a key", title: "x" },
      { key: 3, title: "x" },
      null,
      { key: "done", title: "Done", color: "red" },
    ];
    expect(normalizeColumns(raw)).toEqual([
      { key: "todo", title: "todo" },
      { key: "done", title: "Done" },
    ]);
  });

  it("uses the default lists when there are none", () => {
    expect(normalizeColumns([])).toBe(DEFAULT_HEADERS);
    expect(normalizeColumns(undefined)).toBe(DEFAULT_HEADERS);
  });
});

describe("defaultListColor", () => {
  it("has a colour per default list and grey for added lists", () => {
    expect(defaultListColor("todo")).toBe("#eed7fc");
    expect(defaultListColor("review")).toBe(NEW_LIST_COLOR);
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
  });

  it("uses the backend status keys", () => {
    expect(DEFAULT_HEADERS.map((h) => h.key)).toEqual(["todo", "in-progress", "test", "done"]);
  });
});

describe("columnForStatus / statusForColumn", () => {
  it("maps each status to its column and back", () => {
    DEFAULT_HEADERS.forEach((h, i) => {
      expect(columnForStatus(H, h.key)).toBe(i);
      expect(statusForColumn(H, i)).toBe(h.key);
    });
  });

  it("finds a list an admin added", () => {
    expect(columnForStatus(WITH_REVIEW, "review")).toBe(4);
    expect(statusForColumn(WITH_REVIEW, 4)).toBe("review");
  });

  it("puts cards without a known status in To Do", () => {
    expect(columnForStatus(H, undefined)).toBe(0);
    expect(columnForStatus(H, "archived")).toBe(0);
  });

  it("clamps out-of-range columns", () => {
    expect(statusForColumn(H, -1)).toBe("todo");
    expect(statusForColumn(H, 9)).toBe("done");
  });
});

describe("buildCardLayout", () => {
  it("places cards in the column of their status, one cell each", () => {
    expect(
      buildCardLayout(H, [
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
    expect(buildCardLayout(H, [{ id: "a", status: "done" }], saved)).toEqual([
      { i: "a", x: 3, y: 4, w: 1, h: 1 },
    ]);
  });

  it("follows the status when someone else moved the card", () => {
    const saved = [{ id: "a", x: 0, y: 2, w: 1, h: 1 }];
    expect(buildCardLayout(H, [{ id: "a", status: "in-progress" }], saved)).toEqual([
      { i: "a", x: 1, y: 0, w: 1, h: 1 },
    ]);
  });

  it("places cards without a saved row below the saved ones in their column", () => {
    const saved = [{ id: "a", x: 0, y: 2, w: 1, h: 1 }];
    expect(buildCardLayout(H, [{ id: "new" }, { id: "a" }], saved)[0]).toEqual({
      i: "new",
      x: 0,
      y: 3,
      w: 1,
      h: 1,
    });
  });
});

describe("listHeight", () => {
  it("fits the header, the add button and one row per card", () => {
    expect(listHeight(0)).toBe(HEADER_HEIGHT + ADD_BUTTON_HEIGHT);
    expect(listHeight(0)).toBe(CARDS_TOP);
    expect(listHeight(2)).toBe(listHeight(0) + 2 * (ROW_HEIGHT + GRID_MARGIN));
  });
});

describe("collapsed columns", () => {
  it("keeps strings without duplicates (lists may load later)", () => {
    expect(normalizeCollapsed(["done", "review", "todo", "done", 3])).toEqual(["done", "review", "todo"]);
    expect(normalizeCollapsed("todo")).toEqual([]);
    expect(normalizeCollapsed(null)).toEqual([]);
  });

  it("toggles a column in and out", () => {
    expect(toggleCollapsed([], "test")).toEqual(["test"]);
    expect(toggleCollapsed(["todo", "test"], "test")).toEqual(["todo"]);
  });

  it("checks a grid column against the collapsed statuses", () => {
    expect(isColumnCollapsed(H, ["test"], columnForStatus(H, "test"))).toBe(true);
    expect(isColumnCollapsed(H, ["test"], columnForStatus(H, "done"))).toBe(false);
  });
});

describe("board columns", () => {
  it("splits the board evenly when nothing is hidden", () => {
    const columns = boardColumns(H, []);
    expect(columns.expandedSpan).toBe(EXPANDED_SPAN);
    expect(columns.units).toBe(BOARD_UNITS);
    expect(columns.spans.map((s) => s.start)).toEqual([0, 4, 8, 12]);
  });

  it("shrinks a hidden list to one unit without widening the others", () => {
    const columns = boardColumns(H, ["in-progress"]);
    expect(columns.spans).toEqual([
      { start: 0, span: 4, collapsed: false },
      { start: 4, span: 1, collapsed: true },
      { start: 5, span: 4, collapsed: false },
      { start: 9, span: 4, collapsed: false },
    ]);
    expect(columns.units).toBe(13);
    expect(desktopBoardWidth(columns)).toBe("81.25%");
  });

  it("fills the screen on desktop when nothing is hidden", () => {
    expect(desktopBoardWidth(boardColumns(H, []))).toBe("100%");
  });

  it("keeps narrow strips when every list is hidden", () => {
    const columns = boardColumns(H, DEFAULT_HEADERS.map((h) => h.key));
    expect(columns.spans.map((s) => s.span)).toEqual([1, 1, 1, 1]);
    expect(columns.units).toBe(4);
    expect(desktopBoardWidth(columns)).toBe("25%");
    expect(mobileBoardWidth(columns)).toBe("100%");
  });

  it("snaps a grid position to the nearest visible list", () => {
    const columns = boardColumns(H, ["in-progress"]);
    expect(columnAtGridX(columns, 0)).toBe(0);
    expect(columnAtGridX(columns, 4)).toBe(2); // remsan hoppas över
    expect(columnAtGridX(columns, 8)).toBe(3);
    expect(snapGridX(columns, 6)).toBe(5);
  });

  it("converts card positions to grid units and back", () => {
    const columns = boardColumns(H, ["todo"]);
    const layout = [{ i: "a", x: 2, y: 1, w: 1, h: 1 }];
    const grid = toGridLayout(layout, columns);
    expect(grid).toEqual([{ i: "a", x: 5, y: 1, w: 4, h: 1 }]);
    expect(fromGridLayout(grid, columns)).toEqual(layout);
  });

  it("makes the board wider than the screen for more than four lists", () => {
    const columns = boardColumns(WITH_REVIEW, []);
    expect(columns.units).toBe(20);
    expect(desktopBoardWidth(columns)).toBe("125%");
    expect(mobileBoardWidth(columns)).toBe("500%");
  });

  it("adds room after the lists for the add-list slot", () => {
    const columns = boardColumns(H, [], EXPANDED_SPAN);
    expect(columns.units).toBe(BOARD_UNITS + EXPANDED_SPAN);
    expect(columns.spans.map((s) => s.start)).toEqual([0, 4, 8, 12]);
    // Kort snäpper aldrig till platsen för "Add another list"
    expect(columnAtGridX(columns, 17)).toBe(3);
  });

  it("makes each visible list one screen wide on mobile", () => {
    expect(mobileBoardWidth(boardColumns(H, []))).toBe("400%");
    expect(mobileBoardWidth(boardColumns(H, ["done"]))).toBe("325%");
  });
});

describe("column helpers", () => {
  const layout = [
    { i: "a", x: 0, y: 0, w: 1, h: 1 },
    { i: "b", x: 0, y: 1, w: 1, h: 1 },
    { i: "c", x: 2, y: 0, w: 1, h: 1 },
  ];

  it("counts cards per column", () => {
    expect(countCardsPerColumn(H, layout)).toEqual([2, 0, 1, 0]);
  });

  it("gives a collapsed list no rows", () => {
    expect(rowsPerColumn([2, 0, 1, 0], boardColumns(H, ["todo"]))).toEqual([0, 0, 1, 0]);
  });

  it("splits out cards in collapsed lists", () => {
    const { visible, hidden } = splitByCollapsed(H, layout, ["todo"]);

    expect(visible.map((l) => l.i)).toEqual(["c"]);
    expect(hidden.map((l) => l.i)).toEqual(["a", "b"]);
  });
});
