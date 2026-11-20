'use client';
import { useEffect, useMemo, useRef, useState } from "react";
import { gridBounds, type EventCallback, type Layout, type LayoutConstraint } from "react-grid-layout/core";
import type { Card } from "../api/endpoints";
import {
  HIDDEN_LIST_ATTR,
  LIST_KEY_ATTR,
  cardDragGridX,
  columnAtGridX,
  eventPoint,
  nearestListIndexAtX,
  statusForColumn,
  type BoardColumns,
  type BoardHeader,
  type CardStatus,
} from "../utils/boardLayout";

type CardDragOptions = {
  columns: BoardColumns;
  // Listorna i den ordning boarden visar dem
  headers: BoardHeader[];
  // Gridens id → kortet
  cardById: Map<string, Card>;
  moveCard: (id: string, status: CardStatus) => void;
  // Sparar kortens ordning ur gridens layout
  saveOrder: (layout: Layout) => void;
};

// Dold lista (smal remsa) under pekaren, om någon
const hiddenListAt = (e: Event): CardStatus | null => {
  const point = eventPoint(e);
  if (!point) return null;
  const strip = document.elementsFromPoint(point.x, point.y).find((el) => el.hasAttribute(HIDDEN_LIST_ATTR));
  return strip?.getAttribute(HIDDEN_LIST_ATTR) ?? null;
};

// Att dra ett kort på boarden: kortet hamnar i listan pekaren är över, kan släppas på en dold lista,
// och byter status när det hamnar i en annan lista
export function useCardDrag({ columns, headers, cardById, moveCard, saveOrder }: CardDragOptions) {
  // Pekarens x-position. pointermove/pointerdown kommer före react-draggables mus-/touch-event,
  // så den är aktuell när gridden räknar ut kortets plats
  const pointerXRef = useRef<number | null>(null);
  useEffect(() => {
    const track = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
    };
    window.addEventListener("pointerdown", track, true);
    window.addEventListener("pointermove", track, true);
    return () => {
      window.removeEventListener("pointerdown", track, true);
      window.removeEventListener("pointermove", track, true);
    };
  }, []);

  // Ett draget kort hamnar i listan pekaren är över, som när en lista dras (inte där kortets vänsterkant är)
  const constraints = useMemo<LayoutConstraint[]>(
    () => [
      gridBounds,
      {
        name: "boardColumn",
        constrainPosition: (_item, x, y) => {
          const pointerX = pointerXRef.current;
          const lists = Array.from(document.querySelectorAll(`[${LIST_KEY_ATTR}]`), (el) => el.getBoundingClientRect());
          return { x: cardDragGridX(columns, x, pointerX === null ? null : nearestListIndexAtX(lists, pointerX)), y };
        },
      },
    ],
    [columns],
  );

  // Dold lista som ett draget kort är över (remsan markeras); släpps kortet där flyttas det dit
  const [dropTarget, setDropTarget] = useState<CardStatus | null>(null);
  // react-grid-layout ritar bara om ett kort när dess props ändras (GridItem är memo), så ett draget kort
  // står still tills det byter ruta. En ny render per dragsteg ger nya children, så kortet följer pekaren
  const [, setDragFrame] = useState(0);

  const onDrag: EventCallback = (_layout, _oldItem, _newItem, _placeholder, e) => {
    setDropTarget(hiddenListAt(e));
    setDragFrame((n) => n + 1);
  };

  const onDragStop: EventCallback = (currentLayout, oldItem, newItem, _placeholder, e) => {
    if (!oldItem || !newItem) return;
    // Släppt på en dold lista: kortet flyttas dit och hamnar överst
    // (det saknar sparad position där, se buildCardLayout)
    const hiddenTarget = hiddenListAt(e);
    setDropTarget(null);
    if (hiddenTarget) {
      const moved = cardById.get(newItem.i);
      if (moved?._id) moveCard(moved._id, hiddenTarget);
      return;
    }
    const from = columnAtGridX(columns, oldItem.x);
    const to = columnAtGridX(columns, newItem.x);
    if (from === to) return;
    // Spara radordningen direkt så att kortet inte hoppar när statusen ändras
    saveOrder(currentLayout);
    const card = cardById.get(newItem.i);
    if (card?._id) moveCard(card._id, statusForColumn(headers, to));
  };

  return { constraints, dropTarget, onDrag, onDragStop };
}
