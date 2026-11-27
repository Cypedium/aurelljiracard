import { describe, expect, it } from "@jest/globals";
import { needsMove, saveThenMove } from "../../app/utils/saveCard";

describe("needsMove", () => {
  it("is false when no list was picked or the same list was picked", () => {
    expect(needsMove(null, "todo")).toBe(false);
    expect(needsMove("todo", "todo")).toBe(false);
  });

  it("is true for another list, also from the backlog or an unknown status", () => {
    expect(needsMove("done", "todo")).toBe(true);
    expect(needsMove("todo", "backlog")).toBe(true);
    expect(needsMove("todo", undefined)).toBe(true);
  });
});

describe("saveThenMove", () => {
  it("returns the saved card when there is no move", async () => {
    await expect(saveThenMove(async () => "saved", null)).resolves.toEqual({ card: "saved" });
  });

  it("returns the moved card after a move", async () => {
    await expect(saveThenMove(async () => "saved", async () => "moved")).resolves.toEqual({ card: "moved" });
  });

  it("keeps the saved card and reports the error when only the move fails", async () => {
    const error = new Error("move failed");
    const result = await saveThenMove(
      async () => "saved",
      async () => {
        throw error;
      },
    );
    expect(result).toEqual({ card: "saved", moveError: error });
  });

  it("rejects without moving when the save fails", async () => {
    let moved = false;
    const error = new Error("save failed");
    await expect(
      saveThenMove(
        async () => {
          throw error;
        },
        async () => {
          moved = true;
          return "moved";
        },
      ),
    ).rejects.toBe(error);
    expect(moved).toBe(false);
  });
});
