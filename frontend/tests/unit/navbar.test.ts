import { describe, expect, it } from "@jest/globals";
import { BOARD_ACTIONS } from "../../app/utils/boardActions";
import { BOARD_ACTION_FEATURES } from "../../app/utils/features";
import { navSubActions, type NavPage } from "../../app/utils/navbar";
import { ROUTES } from "../../app/utils/routes";

const page = (overrides: Partial<NavPage>): NavPage => ({
  pathname: ROUTES.board,
  loggedIn: true,
  boardAdmin: false,
  hasBoard: true,
  isOn: () => true,
  ...overrides,
});
const actions = (overrides: Partial<NavPage>) => navSubActions(page(overrides)).map((a) => a.action);
const labels = (overrides: Partial<NavPage>) => navSubActions(page(overrides)).map((a) => a.label);

describe("navSubActions", () => {
  it("shows nothing when logged out", () => {
    expect(actions({ loggedIn: false })).toEqual([]);
  });

  it("board admin: create card, columns and Share", () => {
    expect(actions({ boardAdmin: true })).toEqual([
      BOARD_ACTIONS.createCard,
      BOARD_ACTIONS.createColumn,
      BOARD_ACTIONS.deleteColumn,
      BOARD_ACTIONS.shareBoard,
    ]);
    expect(labels({ boardAdmin: true })).toContain("Share");
  });

  it("collaborator: create card and Members, no column actions", () => {
    expect(actions({})).toEqual([BOARD_ACTIONS.createCard, BOARD_ACTIONS.shareBoard]);
    expect(labels({})).toContain("Members");
  });

  it("no Share or Members before the board has loaded", () => {
    expect(actions({ hasBoard: false })).toEqual([BOARD_ACTIONS.createCard]);
  });

  it("backlog: create card only", () => {
    expect(actions({ pathname: ROUTES.backlog, boardAdmin: true })).toEqual([BOARD_ACTIONS.createCard]);
  });

  it("issue types: create issue type, for the board admin only", () => {
    expect(actions({ pathname: ROUTES.issueTypes, boardAdmin: true })).toEqual([BOARD_ACTIONS.createIssueType]);
    expect(actions({ pathname: ROUTES.issueTypes })).toEqual([]);
  });

  it("other pages: nothing", () => {
    expect(actions({ pathname: ROUTES.users, boardAdmin: true })).toEqual([]);
  });

  it("leaves out actions whose feature is switched off", () => {
    const off = BOARD_ACTION_FEATURES[BOARD_ACTIONS.createCard];
    expect(actions({ boardAdmin: true, isOn: (key) => key !== off })).not.toContain(BOARD_ACTIONS.createCard);
  });
});
