'use client';
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getBoards, joinBoard, type Board } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import { CURRENT_BOARD_KEY, PENDING_INVITE_KEY, isBoardAdmin, pickBoard } from "../utils/currentBoard";
import { readText, removeStored, writeText } from "../utils/storage";
import { getUsername, hasSession } from "../utils/session";
import { createStore } from "../utils/store";
import { boardName } from "../utils/currentBoard";
import { msg } from "../utils/i18n";
import { t } from "../utils/languageStore";

// The user's boards (their own + the ones they collaborate on) and the one shown, shared by the navbar and the pages.
// Fetched once per login; if another user logs in in the same tab they are fetched again
type BoardsState = {
  boards: Board[];
  current: Board | null;
  loaded: boolean;
};

const EMPTY: BoardsState = { boards: [], current: null, loaded: false };

const store = createStore<BoardsState>(EMPTY);
let loadedFor: string | null = null;
let loading = false;

const rememberBoard = (id: string) => writeText(CURRENT_BOARD_KEY, id);

const setState = (boards: Board[], preferredId: string | null) => {
  const current = pickBoard(boards, preferredId);
  if (current) rememberBoard(current._id);
  store.set({ boards, current, loaded: true });
};

// An invite opened before logging in (the /invite/[token] page) is accepted now
const acceptPendingInvite = async (): Promise<Board | null> => {
  const token = readText(PENDING_INVITE_KEY, "session");
  if (!token) return null;
  removeStored(PENDING_INVITE_KEY, "session");
  try {
    const board = (await joinBoard(token)).data;
    toast.success(t("You joined {board}.", { board: boardName(board, t) }));
    return board;
  } catch (err) {
    reportError("Join board error", err, msg("Could not join the board."));
    return null;
  }
};

const load = async (force = false) => {
  // Without a login the API answers 401
  if (loading || !hasSession()) return;
  const user = getUsername();
  if (!force && loadedFor === user && store.get().loaded) return;
  if (loadedFor !== user) store.set(EMPTY);
  loading = true;
  try {
    const joined = await acceptPendingInvite();
    const res = await getBoards();
    loadedFor = user;
    setState(res.data || [], joined?._id ?? store.get().current?._id ?? readText(CURRENT_BOARD_KEY));
  } catch (err) {
    reportError("Error fetching boards", err, msg("Could not load your boards."), "boards");
  } finally {
    loading = false;
  }
};

// Switches board in the navbar; the pages fetch their data again when current changes
export const selectBoard = (id: string) => {
  const { boards, current } = store.get();
  if (id === current?._id) return;
  setState(boards, id);
};

// After joining through a link: the board is added and shown
export const showJoinedBoard = (board: Board) => {
  const { boards } = store.get();
  setState(boards.some((b) => b._id === board._id) ? boards : [...boards, board], board._id);
};

// After leaving a board: fetched again, and your own board is shown
export const reloadBoards = () => load(true);

export function useBoards() {
  useEffect(() => {
    load();
  }, []);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, () => EMPTY);
  return { ...snapshot, boardAdmin: isBoardAdmin(snapshot.current) };
}
