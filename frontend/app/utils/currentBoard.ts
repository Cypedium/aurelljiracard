// Vilken board som visas. Varje användare äger en board och kan vara med på andras via en inbjudningslänk.
// Valet sparas per webbläsare; finns boarden inte längre (lämnad, borttagen) visas den egna
import type { Board } from "../api/endpoints";

export const CURRENT_BOARD_KEY = "current_board";
// En inbjudan som öppnades utan inloggning; tas emot efter inloggningen (useBoards)
export const PENDING_INVITE_KEY = "pending_invite";
export const INVITE_PATH = "/invite";

// Den sparade boarden om användaren fortfarande är med på den, annars den första (den egna, backend sorterar så)
export const pickBoard = (boards: Board[], savedId: string | null): Board | null =>
  boards.find((b) => b._id === savedId) ?? boards[0] ?? null;

// Ägaren är boardens admin (listor, ärendetyper, alla kort, inbjudningar); medarbetare är "user"
export const isBoardAdmin = (board: Board | null | undefined): boolean => board?.role === "admin";

export const inviteUrl = (origin: string, token: string): string =>
  `${origin}${INVITE_PATH}/${encodeURIComponent(token)}`;
