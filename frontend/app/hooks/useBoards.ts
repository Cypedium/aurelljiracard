'use client';
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getBoards, joinBoard, type Board } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import { CURRENT_BOARD_KEY, PENDING_INVITE_KEY, isBoardAdmin, pickBoard } from "../utils/currentBoard";
import { readText, removeStored, writeText } from "../utils/storage";
import { getUsername, hasSession } from "../utils/session";
import { createStore } from "../utils/store";

// Användarens boards (den egna + de hen är medarbetare på) och den som visas, delade av navbaren och sidorna.
// Hämtas en gång per inloggning; byter användare i samma flik hämtas de på nytt
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

// En inbjudan som öppnades före inloggningen (sidan /invite/[token]) tas emot nu
const acceptPendingInvite = async (): Promise<Board | null> => {
  const token = readText(PENDING_INVITE_KEY, "session");
  if (!token) return null;
  removeStored(PENDING_INVITE_KEY, "session");
  try {
    const board = (await joinBoard(token)).data;
    toast.success(`You joined ${board.name}.`);
    return board;
  } catch (err) {
    reportError("Join board error", err, "Could not join the board.");
    return null;
  }
};

const load = async (force = false) => {
  // Utan inloggning svarar API:t 401
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
    reportError("Error fetching boards", err, "Could not load your boards.", "boards");
  } finally {
    loading = false;
  }
};

// Byter board i navbaren; sidorna hämtar om sina data när current ändras
export const selectBoard = (id: string) => {
  const { boards, current } = store.get();
  if (id === current?._id) return;
  setState(boards, id);
};

// Efter att ha gått med via en länk: boarden läggs till och visas
export const showJoinedBoard = (board: Board) => {
  const { boards } = store.get();
  setState(boards.some((b) => b._id === board._id) ? boards : [...boards, board], board._id);
};

// Efter att ha lämnat en board: hämtas om, och den egna visas
export const reloadBoards = () => load(true);

export function useBoards() {
  useEffect(() => {
    load();
  }, []);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, () => EMPTY);
  return { ...snapshot, boardAdmin: isBoardAdmin(snapshot.current) };
}
