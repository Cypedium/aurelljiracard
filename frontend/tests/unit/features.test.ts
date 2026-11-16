import { describe, expect, it } from "@jest/globals";
import { BACKLOG_FOR_EVERYONE, backlogVisible } from "../../app/utils/features";

describe("features", () => {
  it("shows the backlog to the site admin", () => {
    expect(backlogVisible(true)).toBe(true);
  });

  it("hides the backlog from other users until it is enabled for everyone", () => {
    expect(backlogVisible(false)).toBe(BACKLOG_FOR_EVERYONE);
  });
});
