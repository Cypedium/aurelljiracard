import { describe, expect, it } from "@jest/globals";
import { BACKLOG_STATUS, CARD_DESTINATIONS, DEFAULT_DESTINATION, assigneeOf, backlogCards, boardCards, isBacklogCard } from "../../app/utils/backlog";

const cards = [
  { id: "1", status: "todo" },
  { id: "2", status: BACKLOG_STATUS },
  { id: "3" },
  { id: "4", status: "done" },
];

describe("backlog", () => {
  it("matches the backend status", () => {
    expect(BACKLOG_STATUS).toBe("backlog");
  });

  it("splits cards into board and backlog; cards without status stay on the board", () => {
    expect(boardCards(cards).map((c) => c.id)).toEqual(["1", "3", "4"]);
    expect(backlogCards(cards).map((c) => c.id)).toEqual(["2"]);
    expect(isBacklogCard({ status: "in-progress" })).toBe(false);
  });

  it("offers the board columns and then the backlog as destinations, defaulting to To Do", () => {
    expect(CARD_DESTINATIONS.map((d) => d.key)).toEqual(["todo", "in-progress", "test", "done", "backlog"]);
    expect(CARD_DESTINATIONS.at(-1)?.label).toBe("Backlog");
    expect(DEFAULT_DESTINATION).toBe("todo");
  });

  it("shows the assignee, falling back to the author for older cards", () => {
    expect(assigneeOf({ username: "alice", assignee: "bob" })).toBe("bob");
    expect(assigneeOf({ username: "alice", assignee: null })).toBe("alice");
    expect(assigneeOf({ username: "alice" })).toBe("alice");
  });
});
