'use client';
import { useEffect, useState } from "react";
import { COLLAPSED_STORAGE_KEY, normalizeCollapsed, toggleCollapsed, type CardStatus } from "../utils/boardLayout";
import { readJson, writeJson } from "../utils/storage";

// Ihopfällda listor visar bara en smal remsa. Sparas per webbläsare i localStorage
export function useCollapsedLists() {
  const [collapsed, setCollapsed] = useState<CardStatus[]>([]);

  useEffect(() => setCollapsed(readJson(COLLAPSED_STORAGE_KEY, normalizeCollapsed, [])), []);

  const toggleColumn = (key: CardStatus) => {
    const next = toggleCollapsed(collapsed, key);
    setCollapsed(next);
    writeJson(COLLAPSED_STORAGE_KEY, next);
  };

  return { collapsed, toggleColumn };
}
