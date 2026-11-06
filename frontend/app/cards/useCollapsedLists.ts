'use client';
import { useEffect, useState } from "react";
import { normalizeCollapsed, toggleCollapsed, type CardStatus } from "../utils/boardLayout";

const COLLAPSED_STORAGE_KEY = "collapsed_columns";

// Ihopfällda listor visar bara en smal remsa. Sparas per webbläsare i localStorage
export function useCollapsedLists() {
  const [collapsed, setCollapsed] = useState<CardStatus[]>([]);

  useEffect(() => {
    try {
      setCollapsed(normalizeCollapsed(JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]")));
    } catch {
      setCollapsed([]);
    }
  }, []);

  const toggleColumn = (key: CardStatus) => {
    const next = toggleCollapsed(collapsed, key);
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sparas inte, men fungerar tills sidan laddas om
    }
  };

  return { collapsed, toggleColumn };
}
