'use client';
import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import { getCards, getColumns, getLayout, saveLayout, type Card } from "../api/endpoints";
import { logError, reportError } from "../utils/apiError";
import { boardCards } from "../utils/backlog";
import { readJson, writeJson } from "../utils/storage";
import {
  DEFAULT_HEADERS,
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
  mergeBoardPositions,
  normalizeColumns,
  normalizeLayout,
  type BoardHeader,
  type UserLayout,
} from "../utils/boardLayout";

// Fetches the board's cards and lists and the user's layout. When the board changes everything is fetched again
export function useBoardData(boardId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [userLayout, setUserLayout] = useState<UserLayout>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  // The board's lists, shared by its members; the board's admin adds, renames and recolours them
  const [headers, setHeaders] = useState<BoardHeader[]>(DEFAULT_HEADERS);
  const [columnsLoaded, setColumnsLoaded] = useState(false);
  // Every card on the board (the backlog too): their positions are replaced when the layout is saved
  const boardCardIds = useRef<Set<string>>(new Set());

  // Fetch the cards via api.ts (includes token rotation)
  const fetchCards = useCallback(async () => {
    try {
      const res = await getCards(boardId);
      boardCardIds.current = new Set((res.data || []).flatMap((c) => (c._id ? [c._id] : [])));
      // The backlog is shown on /backlog, not on the board
      setCards(boardCards(res.data || []));
    } catch (err) {
      reportError("Error fetching cards", err, "Could not load cards.");
    } finally {
      setCardsLoaded(true);
    }
  }, [boardId]);

  useEffect(() => {
    setCards([]);
    setCardsLoaded(false);
    fetchCards();
  }, [fetchCards]);

  // Fetch the layout from the server or localStorage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await getLayout();
        if (res.status === 200) {
          setUserLayout(normalizeLayout(res.data || {}));
          return;
        }
      } catch (e) {
        console.warn("Could not load layout from server, falling back to localStorage");
      }

      setUserLayout(readJson(LAYOUT_STORAGE_KEY, normalizeLayout, DEFAULT_LAYOUT));
    };

    loadLayout().finally(() => setLayoutLoaded(true));
  }, []);

  // The board's lists; if fetching fails the default lists are shown
  useEffect(() => {
    let current = true;
    setColumnsLoaded(false);
    getColumns(boardId)
      .then((res) => current && setHeaders(normalizeColumns(res.data)))
      .catch((err) => {
        reportError("Error fetching lists", err, "Could not load the lists.");
      })
      .finally(() => current && setColumnsLoaded(true));
    // A response for a board the user has already left doesn't overwrite the new one
    return () => {
      current = false;
    };
  }, [boardId]);

  // Save the layout to the server via api.ts
  const saveLayoutToServer = useCallback(
    debounce(async (newLayout: UserLayout) => {
      try {
        await saveLayout(newLayout);
      } catch (e) {
        logError("Failed to save layout to server", e);
        // Fixed id: repeated errors replace the same toast instead of stacking up
        toast.error("Could not save the board layout. It is kept in this browser.", { id: "layout-save" });
      }
    }, 800),
    [],
  );

  // Positions of cards on the user's other boards come along unchanged
  const persistLayout = (next: UserLayout) => {
    const merged = { ...next, cards: mergeBoardPositions(userLayout.cards, next.cards, boardCardIds.current) };
    setUserLayout(merged);
    // Saved to the server even if the browser can't save it
    writeJson(LAYOUT_STORAGE_KEY, merged);
    saveLayoutToServer(merged);
  };

  return {
    cards,
    setCards,
    cardsLoaded,
    fetchCards,
    userLayout,
    layoutLoaded,
    persistLayout,
    headers,
    setHeaders,
    columnsLoaded,
  };
}
