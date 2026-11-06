'use client';
import { useCallback, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import { getCards, getColumns, getLayout, saveLayout, type Card } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { boardCards } from "../utils/backlog";
import {
  DEFAULT_HEADERS,
  DEFAULT_LAYOUT,
  normalizeColumns,
  normalizeLayout,
  type BoardHeader,
  type UserLayout,
} from "../utils/boardLayout";

// Hämtar boardens kort, användarens layout och de delade listorna
export function useBoardData() {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [userLayout, setUserLayout] = useState<UserLayout>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  // Listorna delas av alla; admins lägger till, byter namn och färg
  const [headers, setHeaders] = useState<BoardHeader[]>(DEFAULT_HEADERS);
  const [columnsLoaded, setColumnsLoaded] = useState(false);

  // 🔥 Hämta card via api.ts (token-rotation ingår)
  const fetchCards = useCallback(async () => {
    try {
      const res = await getCards();
      // Backloggen visas på /backlog, inte på boarden
      setCards(boardCards(res.data || []));
    } catch (err: any) {
      console.error("Error fetching cards:", err.message);
      toast.error(apiErrorMessage(err, "Could not load cards."));
    } finally {
      setCardsLoaded(true);
    }
  }, []);

  useEffect(() => {
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
        const saved = localStorage.getItem("user_layout");
        setUserLayout(saved ? normalizeLayout(JSON.parse(saved)) : DEFAULT_LAYOUT);
      } catch {
        setUserLayout(DEFAULT_LAYOUT);
      }
    };

    loadLayout().finally(() => setLayoutLoaded(true));
  }, []);

  // Delade listor; om hämtningen misslyckas visas standardlistorna
  useEffect(() => {
    getColumns()
      .then((res) => setHeaders(normalizeColumns(res.data)))
      .catch((err) => {
        console.error("Error fetching lists:", err.message);
        toast.error(apiErrorMessage(err, "Could not load the lists."));
      })
      .finally(() => setColumnsLoaded(true));
  }, []);

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

  const persistLayout = (next: UserLayout) => {
    setUserLayout(next);
    localStorage.setItem("user_layout", JSON.stringify(next));
    saveLayoutToServer(next);
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
