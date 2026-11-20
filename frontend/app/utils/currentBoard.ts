// Which board is shown. Every user owns one board and can join others' through an invite link.
// The choice is saved per browser; if the board no longer exists (left, deleted) your own is shown
import type { Board } from "../api/endpoints";

export const CURRENT_BOARD_KEY = "current_board";
// An invite opened without being logged in; accepted after login (useBoards)
export const PENDING_INVITE_KEY = "pending_invite";
export const INVITE_PATH = "/invite";

// The saved board if the user is still on it, otherwise the first one (their own; the backend sorts it that way)
export const pickBoard = (boards: Board[], savedId: string | null): Board | null =>
  boards.find((b) => b._id === savedId) ?? boards[0] ?? null;

// The owner is the board's admin (lists, issue types, every card, invitations); collaborators are "user"
export const isBoardAdmin = (board: Board | null | undefined): boolean => board?.role === "admin";

// The name in the board switcher: your own is "My board", others' "<owner>'s board" (from the backend)
export const OWN_BOARD_LABEL = "My board";
export const boardLabel = (board: Board): string => (isBoardAdmin(board) ? OWN_BOARD_LABEL : board.name);

export const inviteUrl = (origin: string, token: string): string =>
  `${origin}${INVITE_PATH}/${encodeURIComponent(token)}`;
