'use client';
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { createColumn, deleteColumn, reorderColumns, updateColumn } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import {
  listTitle,
  moveHeader,
  normalizeColumns,
  recolorHeader,
  renameHeader,
  withListKeys,
  type BoardHeader,
  type CardStatus,
  type UserLayout,
} from "../utils/boardLayout";
import { msg } from "../utils/i18n";
import { t } from "../utils/languageStore";

type Options = {
  boardId: string;
  headers: BoardHeader[];
  setHeaders: Dispatch<SetStateAction<BoardHeader[]>>;
  userLayout: UserLayout;
  persistLayout: (next: UserLayout) => void;
};

// The board's admin: add, rename, recolour, move and delete the lists (for everyone on the board).
// The change shows at once; on an error the lists are restored
export function useColumnActions({ boardId, headers, setHeaders, userLayout, persistLayout }: Options) {
  // The column whose header is being edited
  const [renamingKey, setRenamingKey] = useState<CardStatus | null>(null);
  // The "Add new column" form is open
  const [addingList, setAddingList] = useState(false);
  // The "Delete column" dialog is open
  const [deletingList, setDeletingList] = useState(false);

  const saveColumn = async (next: BoardHeader[], key: CardStatus) => {
    const column = next.find((h) => h.key === key);
    if (next === headers || !column) return;
    const previous = headers;
    setHeaders(next);
    try {
      await updateColumn(boardId, key, { title: column.title, color: column.color ?? null });
    } catch (err) {
      setHeaders(previous);
      reportError("Error updating list", err, msg("Could not update the list."));
    }
  };

  const renameColumn = (key: CardStatus, title: string) => {
    setRenamingKey(null);
    saveColumn(renameHeader(headers, key, title), key);
  };

  // null = the default colour
  const recolorColumn = (key: CardStatus, color: string | null) => saveColumn(recolorHeader(headers, key, color), key);

  // The cards follow the list (they belong to the list through their status)
  const moveList = async (from: CardStatus, to: CardStatus) => {
    const next = moveHeader(headers, from, to);
    if (next === headers) return;
    // Older saved positions only have the list's index: save the list's key before the order changes
    if (userLayout.cards?.some((c) => c.status === undefined)) {
      persistLayout({ ...userLayout, cards: withListKeys(headers, userLayout.cards) });
    }
    const previous = headers;
    setHeaders(next);
    try {
      await reorderColumns(boardId, next.map((h) => h.key));
    } catch (err) {
      setHeaders(previous);
      reportError("Error moving list", err, msg("Could not move the list."));
    }
  };

  // A new list at the end of the board. An empty name closes the form
  const addList = async (title: string) => {
    if (!title.trim()) {
      setAddingList(false);
      return;
    }
    try {
      const res = await createColumn(boardId, { title: title.trim() });
      setHeaders((prev) => normalizeColumns([...prev, res.data]));
      setAddingList(false);
    } catch (err) {
      reportError("Error adding list", err, msg("Could not add the list."));
    }
  };

  // Only empty lists; the server answers 409 if someone managed to add a card there
  const removeList = async (key: CardStatus) => {
    const header = headers.find((h) => h.key === key);
    const title = header ? listTitle(header, t) : key;
    try {
      await deleteColumn(boardId, key);
      setHeaders((prev) => prev.filter((h) => h.key !== key));
      setDeletingList(false);
      toast.success(t("List {title} deleted.", { title }));
    } catch (err) {
      reportError("Error deleting list", err, msg("Could not delete the list."));
    }
  };

  return {
    deletingList,
    setDeletingList,
    removeList,
    renamingKey,
    setRenamingKey,
    addingList,
    setAddingList,
    renameColumn,
    recolorColumn,
    moveList,
    addList,
  };
}
