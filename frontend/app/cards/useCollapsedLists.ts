'use client';
import { useEffect, useState } from "react";
import { COLLAPSED_STORAGE_KEY, normalizeCollapsed, toggleCollapsed, type CardStatus } from "../utils/boardLayout";
import { readJson, writeJson } from "../utils/storage";

// Collapsed lists show only a narrow strip. Saved per browser in localStorage
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
