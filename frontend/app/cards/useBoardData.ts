'use client';
import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import { getCards, getColumns, getLayout, saveLayout, type Card } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { boardCards } from "../utils/backlog";
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

// Hämtar boardens kort och listor och användarens layout. Byts boarden hämtas allt om
export function useBoardData(boardId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [userLayout, setUserLayout] = useState<UserLayout>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  // Boardens listor, delade av dess medlemmar; boardens admin lägger till, byter namn och färg
  const [headers, setHeaders] = useState<BoardHeader[]>(DEFAULT_HEADERS);
  const [columnsLoaded, setColumnsLoaded] = useState(false);
  // Alla kort på boarden (även backloggen): deras positioner ersätts när layouten sparas
  const boardCardIds = useRef<Set<string>>(new Set());

  // 🔥 Hämta card via api.ts (token-rotation ingår)
  const fetchCards = useCallback(async () => {
    try {
      const res = await getCards(boardId);
      boardCardIds.current = new Set((res.data || []).flatMap((c) => (c._id ? [c._id] : [])));
      // Backloggen visas på /backlog, inte på boarden
      setCards(boardCards(res.data || []));
    } catch (err: any) {
      console.error("Error fetching cards:", err.message);
      toast.error(apiErrorMessage(err, "Could not load cards."));
    } finally {
      setCardsLoaded(true);
    }
  }, [boardId]);

  useEffect(() => {
    setCards([]);
    setCardsLoaded(false);
    fetchCards();
  }, [fetchCards]);

  // 🔥 Hämta layout från server eller localStorage
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

      try {
        const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
        setUserLayout(saved ? normalizeLayout(JSON.parse(saved)) : DEFAULT_LAYOUT);
      } catch {
        setUserLayout(DEFAULT_LAYOUT);
      }
    };

    loadLayout().finally(() => setLayoutLoaded(true));
  }, []);

  // Boardens listor; om hämtningen misslyckas visas standardlistorna
  useEffect(() => {
    let current = true;
    setColumnsLoaded(false);
    getColumns(boardId)
      .then((res) => current && setHeaders(normalizeColumns(res.data)))
      .catch((err) => {
        console.error("Error fetching lists:", err.message);
        toast.error(apiErrorMessage(err, "Could not load the lists."));
      })
      .finally(() => current && setColumnsLoaded(true));
    // Ett svar för en board användaren redan har lämnat skriver inte över den nya
    return () => {
      current = false;
    };
  }, [boardId]);

  // 🔥 Spara layout till server via api.ts
  const saveLayoutToServer = useCallback(
    debounce(async (newLayout: UserLayout) => {
      try {
        await saveLayout(newLayout);
      } catch (e: any) {
        console.error("Failed to save layout to server:", e.message);
        // Fast id: upprepade fel ersätter samma toast i stället för att staplas
        toast.error("Could not save the board layout. It is kept in this browser.", { id: "layout-save" });
      }
    }, 800),
    [],
  );

  // Positionerna för kort på användarens andra boards följer med oförändrade
  const persistLayout = (next: UserLayout) => {
    const merged = { ...next, cards: mergeBoardPositions(userLayout.cards, next.cards, boardCardIds.current) };
    setUserLayout(merged);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Privat läge eller fullt: sparas ändå till servern
    }
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
