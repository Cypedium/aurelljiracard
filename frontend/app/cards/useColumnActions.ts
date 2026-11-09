'use client';
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { createColumn, deleteColumn, reorderColumns, updateColumn } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import {
  moveHeader,
  normalizeColumns,
  recolorHeader,
  renameHeader,
  withListKeys,
  type BoardHeader,
  type CardStatus,
  type UserLayout,
} from "../utils/boardLayout";

type Options = {
  headers: BoardHeader[];
  setHeaders: Dispatch<SetStateAction<BoardHeader[]>>;
  userLayout: UserLayout;
  persistLayout: (next: UserLayout) => void;
};

// Admin: lägg till, byt namn, färga, flytta och ta bort listorna (för alla).
// Ändringen visas direkt; vid fel återställs listorna
export function useColumnActions({ headers, setHeaders, userLayout, persistLayout }: Options) {
  // Kolumnen vars rubrik redigeras
  const [renamingKey, setRenamingKey] = useState<CardStatus | null>(null);
  // Formuläret "Add new column" är öppet
  const [addingList, setAddingList] = useState(false);
  // Dialogen "Delete column" är öppen
  const [deletingList, setDeletingList] = useState(false);

  const saveColumn = async (next: BoardHeader[], key: CardStatus) => {
    const column = next.find((h) => h.key === key);
    if (next === headers || !column) return;
    const previous = headers;
    setHeaders(next);
    try {
      await updateColumn(key, { title: column.title, color: column.color ?? null });
    } catch (err: any) {
      console.error("Error updating list:", err.message);
      setHeaders(previous);
      toast.error(apiErrorMessage(err, "Could not update the list."));
    }
  };

  const renameColumn = (key: CardStatus, title: string) => {
    setRenamingKey(null);
    saveColumn(renameHeader(headers, key, title), key);
  };

  // null = standardfärgen
  const recolorColumn = (key: CardStatus, color: string | null) => saveColumn(recolorHeader(headers, key, color), key);

  // Korten följer med listan (de hör till listan via status)
  const moveList = async (from: CardStatus, to: CardStatus) => {
    const next = moveHeader(headers, from, to);
    if (next === headers) return;
    // Äldre sparade positioner har bara listans index: spara listans key innan ordningen ändras
    if (userLayout.cards?.some((c) => c.status === undefined)) {
      persistLayout({ ...userLayout, cards: withListKeys(headers, userLayout.cards) });
    }
    const previous = headers;
    setHeaders(next);
    try {
      await reorderColumns(next.map((h) => h.key));
    } catch (err: any) {
      console.error("Error moving list:", err.message);
      setHeaders(previous);
      toast.error(apiErrorMessage(err, "Could not move the list."));
    }
  };

  // Ny lista sist på boarden. Tomt namn stänger formuläret
  const addList = async (title: string) => {
    if (!title.trim()) {
      setAddingList(false);
      return;
    }
    try {
      const res = await createColumn({ title: title.trim() });
      setHeaders((prev) => normalizeColumns([...prev, res.data]));
      setAddingList(false);
    } catch (err: any) {
      console.error("Error adding list:", err.message);
      toast.error(apiErrorMessage(err, "Could not add the list."));
    }
  };

  // Bara tomma listor; servern svarar 409 om någon hann lägga ett kort där
  const removeList = async (key: CardStatus) => {
    const title = headers.find((h) => h.key === key)?.title ?? key;
    try {
      await deleteColumn(key);
      setHeaders((prev) => prev.filter((h) => h.key !== key));
      setDeletingList(false);
      toast.success(`List ${title} deleted.`);
    } catch (err: any) {
      console.error("Error deleting list:", err.message);
      toast.error(apiErrorMessage(err, "Could not delete the list."));
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
