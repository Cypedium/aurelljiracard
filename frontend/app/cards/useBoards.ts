'use client';
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getBoards, joinBoard, type Board } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import { CURRENT_BOARD_KEY, PENDING_INVITE_KEY, isBoardAdmin, pickBoard } from "../utils/currentBoard";
import { getUsername, hasSession } from "../utils/session";

// Användarens boards (den egna + de hen är medarbetare på) och den som visas, delade av navbaren och sidorna.
// Hämtas en gång per inloggning; byter användare i samma flik hämtas de på nytt
type BoardsState = {
  boards: Board[];
  current: Board | null;
  loaded: boolean;
};

const EMPTY: BoardsState = { boards: [], current: null, loaded: false };

let state: BoardsState = EMPTY;
let loadedFor: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const readStorage = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const rememberBoard = (id: string) => {
  try {
    localStorage.setItem(CURRENT_BOARD_KEY, id);
  } catch {
    // Privat läge e.d.: valet gäller bara den här sidladdningen
  }
};

const setState = (boards: Board[], preferredId: string | null) => {
  const current = pickBoard(boards, preferredId);
  state = { boards, current, loaded: true };
  if (current) rememberBoard(current._id);
  emit();
};

// En inbjudan som öppnades före inloggningen (sidan /invite/[token]) tas emot nu
const acceptPendingInvite = async (): Promise<Board | null> => {
  const token = readStorage(sessionStorage, PENDING_INVITE_KEY);
  if (!token) return null;
  sessionStorage.removeItem(PENDING_INVITE_KEY);
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
  if (!force && loadedFor === user && state.loaded) return;
  if (loadedFor !== user) {
    state = EMPTY;
    emit();
  }
  loading = true;
  try {
    const joined = await acceptPendingInvite();
    const res = await getBoards();
    loadedFor = user;
    setState(res.data || [], joined?._id ?? state.current?._id ?? readStorage(localStorage, CURRENT_BOARD_KEY));
  } catch (err) {
    reportError("Error fetching boards", err, "Could not load your boards.", "boards");
  } finally {
    loading = false;
  }
};

// Byter board i navbaren; sidorna hämtar om sina data när current ändras
export const selectBoard = (id: string) => {
  if (id === state.current?._id) return;
  setState(state.boards, id);
};

// Efter att ha gått med via en länk: boarden läggs till och visas
export const showJoinedBoard = (board: Board) => {
  const boards = state.boards.some((b) => b._id === board._id) ? state.boards : [...state.boards, board];
  setState(boards, board._id);
};

// Efter att ha lämnat en board: hämtas om, och den egna visas
export const reloadBoards = () => load(true);

export function useBoards() {
  useEffect(() => {
    load();
  }, []);
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  return { ...snapshot, boardAdmin: isBoardAdmin(snapshot.current) };
}
