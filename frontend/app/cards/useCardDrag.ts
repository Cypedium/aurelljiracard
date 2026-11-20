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
  // The lists in the order the board shows them
  headers: BoardHeader[];
  // Grid id → the card
  cardById: Map<string, Card>;
  moveCard: (id: string, status: CardStatus) => void;
  // Saves the order of the cards from the grid's layout
  saveOrder: (layout: Layout) => void;
};

// The hidden list (narrow strip) under the pointer, if any
const hiddenListAt = (e: Event): CardStatus | null => {
  const point = eventPoint(e);
  if (!point) return null;
  const strip = document.elementsFromPoint(point.x, point.y).find((el) => el.hasAttribute(HIDDEN_LIST_ATTR));
  return strip?.getAttribute(HIDDEN_LIST_ATTR) ?? null;
};

// Dragging a card on the board: the card lands in the list the pointer is over, can be dropped on a hidden list,
// and changes status when it lands in another list
export function useCardDrag({ columns, headers, cardById, moveCard, saveOrder }: CardDragOptions) {
  // The pointer's x position. pointermove/pointerdown fire before react-draggable's mouse/touch events,
  // so it is up to date when the grid works out the card's position
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

  // A dragged card lands in the list the pointer is over, as when a list is dragged (not where the card's left edge is)
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

  // The hidden list a dragged card is over (the strip is highlighted); a card dropped there moves to it
  const [dropTarget, setDropTarget] = useState<CardStatus | null>(null);
  // react-grid-layout only re-renders a card when its props change (GridItem is memo), so a dragged card
  // stands still until it changes cell. A new render per drag step gives new children, so the card follows the pointer
  const [, setDragFrame] = useState(0);

  const onDrag: EventCallback = (_layout, _oldItem, _newItem, _placeholder, e) => {
    setDropTarget(hiddenListAt(e));
    setDragFrame((n) => n + 1);
  };

  const onDragStop: EventCallback = (currentLayout, oldItem, newItem, _placeholder, e) => {
    if (!oldItem || !newItem) return;
    // Dropped on a hidden list: the card moves there and lands at the top
    // (it has no saved position there, see buildCardLayout)
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
    // Save the row order right away so the card doesn't jump when its status changes
    saveOrder(currentLayout);
    const card = cardById.get(newItem.i);
    if (card?._id) moveCard(card._id, statusForColumn(headers, to));
  };

  return { constraints, dropTarget, onDrag, onDragStop };
}
