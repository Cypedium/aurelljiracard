'use client';
import { useState, type Dispatch, type SetStateAction } from "react";
import { deleteCard, updateCardStatus, type Card } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import type { AnyCardStatus } from "../utils/backlog";
import type { CardStatus } from "../utils/boardLayout";

type Options = {
  boardId: string;
  cards: Card[];
  setCards: Dispatch<SetStateAction<Card[]>>;
  fetchCards: () => void;
};

// Skapa, redigera, ta bort och flytta kort, plus dialogernas tillstånd
export function useCardActions({ boardId, cards, setCards, fetchCards }: Options) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  // Kortet som väntar på bekräftelse i delete-dialogen
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  // Kolumnen där ett nytt kort skapas ("Add a card")
  const [creatingIn, setCreatingIn] = useState<CardStatus | null>(null);

  // Flytta kortet direkt och spara statusen; vid fel flyttas det tillbaka
  const moveCard = async (id: string, status: CardStatus) => {
    const previous = cards.find((fb) => fb._id === id)?.status;
    const setStatus = (s?: AnyCardStatus) =>
      setCards((prev) => prev.map((fb) => (fb._id === id ? { ...fb, status: s } : fb)));

    setStatus(status);
    try {
      await updateCardStatus(boardId, id, status);
    } catch (err) {
      setStatus(previous);
      reportError("Error moving card", err, "Could not move card.");
    }
  };

  const closeDialog = () => {
    setEditingCard(null);
    setCreatingIn(null);
  };

  const handleCardCreated = () => {
    closeDialog();
    fetchCards();
  };

  const handleCardSaved = (updated: Card) => {
    setCards((prev) => prev.map((fb) => (fb._id === updated._id ? updated : fb)));
    setEditingCard(null);
  };

  const removeCard = async (id: string) => {
    try {
      await deleteCard(boardId, id);
      setCards((prev) => prev.filter((fb) => fb._id !== id));
    } catch (err) {
      reportError("Error deleting card", err, "Could not delete card.");
    }
  };

  return {
    editingCard,
    setEditingCard,
    deletingCard,
    setDeletingCard,
    creatingIn,
    setCreatingIn,
    moveCard,
    closeDialog,
    handleCardCreated,
    handleCardSaved,
    removeCard,
  };
}
