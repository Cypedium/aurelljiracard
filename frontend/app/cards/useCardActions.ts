'use client';
import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { deleteCard, updateCardStatus, type Card } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import type { AnyCardStatus } from "../utils/backlog";
import type { CardStatus } from "../utils/boardLayout";

type Options = {
  cards: Card[];
  setCards: Dispatch<SetStateAction<Card[]>>;
  fetchCards: () => void;
};

// Skapa, redigera, ta bort och flytta kort, plus dialogernas tillstånd
export function useCardActions({ cards, setCards, fetchCards }: Options) {
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
      await updateCardStatus(id, status);
    } catch (err: any) {
      console.error("Error moving card:", err.message);
      setStatus(previous);
      toast.error(apiErrorMessage(err, "Could not move card."));
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
      await deleteCard(id);
      setCards((prev) => prev.filter((fb) => fb._id !== id));
    } catch (err: any) {
      console.error("Error deleting card:", err.message);
      toast.error(apiErrorMessage(err, "Could not delete card."));
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
