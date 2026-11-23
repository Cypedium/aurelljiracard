import { describe, expect, it } from "@jest/globals";
import type { Board } from "../../app/api/endpoints";
import { OWN_BOARD_LABEL, boardLabel, inviteUrl, isBoardAdmin, pickBoard, swedishGenitive } from "../../app/utils/currentBoard";
import { translate, type Translate } from "../../app/utils/i18n";

const own: Board = { _id: "b1", name: "alice's board", owner: "alice", role: "admin" };
const shared: Board = { _id: "b2", name: "bob's board", owner: "bob", role: "user" };
const english: Translate = (text, params) => translate("en", text, params);
const swedish: Translate = (text, params) => translate("sv", text, params);

describe("boardLabel", () => {
  it("calls the user's own board My board and keeps the owner's name on shared ones", () => {
    expect(boardLabel(own, english)).toBe(OWN_BOARD_LABEL);
    expect(OWN_BOARD_LABEL).toBe("My board");
    expect(boardLabel(shared, english)).toBe("bob's board");
  });

  it("names boards in Swedish with the Swedish genitive", () => {
    expect(boardLabel(own, swedish)).toBe("Min tavla");
    expect(boardLabel(shared, swedish)).toBe("bobs tavla");
    expect(boardLabel({ ...shared, owner: "Lars" }, swedish)).toBe("Lars tavla");
  });

  it.each([
    ["Mikael", "Mikaels"],
    ["Lars", "Lars"],
    ["Max", "Max"],
    ["Fritz", "Fritz"],
    ["Åsa", "Åsas"],
  ])("swedishGenitive(%p) = %p", (name, genitive) => expect(swedishGenitive(name)).toBe(genitive));
});

describe("pickBoard", () => {
  it("keeps the saved board while the user is still on it", () => {
    expect(pickBoard([own, shared], "b2")).toBe(shared);
  });

  it("falls back to the first (own) board when the saved one is gone or missing", () => {
    expect(pickBoard([own, shared], "left-it")).toBe(own);
    expect(pickBoard([own, shared], null)).toBe(own);
  });

  it("returns null without boards", () => {
    expect(pickBoard([], "b1")).toBeNull();
  });
});

describe("isBoardAdmin", () => {
  it("is true only for the board's owner", () => {
    expect(isBoardAdmin(own)).toBe(true);
    expect(isBoardAdmin(shared)).toBe(false);
    expect(isBoardAdmin(null)).toBe(false);
  });
});

describe("inviteUrl", () => {
  it("builds the link the owner shares", () => {
    expect(inviteUrl("https://aurelljiraboard.fly.dev", "abc_-1")).toBe("https://aurelljiraboard.fly.dev/invite/abc_-1");
  });
});
