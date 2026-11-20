'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  LIST_DRAG_EDGE_PX,
  LIST_DRAG_SCROLL_STEP_PX,
  LIST_DRAG_THRESHOLD_PX,
  LIST_DRAG_TILT_DEG,
  LIST_KEY_ATTR,
  NO_LIST_DRAG_ATTR,
  nearestListIndexAtX,
  type CardStatus,
} from "../utils/boardLayout";

// The list being dragged, its width (for the preview) and the slot (index) the pointer is over
export type ListDrag = {
  key: CardStatus;
  target: number | null;
  width: number;
};

type Options = {
  // The element that scrolls sideways; scrolls when the pointer is near the edge
  scrollRef: RefObject<HTMLElement | null>;
  // toIndex: platsen i listornas ordning
  onDrop: (from: CardStatus, toIndex: number) => void;
};

const previewTransform = (x: number, y: number) => `translate(${x}px, ${y}px) rotate(${LIST_DRAG_TILT_DEG}deg)`;

// Admin: drag a list by its header with the mouse, as in Trello. The lifted list follows the pointer
// (previewRef moves without re-rendering); the slot it is over becomes target. The slot is counted in
// the board's current order, where the lifted list already sits at target, so it doesn't jump back and forth.
// Escape cancels
export function useListDrag({ scrollRef, onDrop }: Options) {
  const [drag, setDrag] = useState<ListDrag | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // The preview's position; changes without re-rendering
  const positionRef = useRef({ x: 0, y: 0 });
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => () => cleanupRef.current(), []);

  // The lists in document order = the board's order
  const listsAt = () =>
    Array.from(document.querySelectorAll<HTMLElement>(`[${LIST_KEY_ATTR}]`), (el) => el.getBoundingClientRect());

  const onPointerDown = (key: CardStatus) => (e: ReactPointerEvent<HTMLElement>) => {
    // Mouse/pen only: on touch you swipe between the lists
    if (e.button !== 0 || e.pointerType === "touch") return;
    if ((e.target as Element).closest(`[${NO_LIST_DRAG_ATTR}]`)) return;
    const list = e.currentTarget.closest(`[${LIST_KEY_ATTR}]`);
    if (!list) return;

    const rect = list.getBoundingClientRect();
    const grab = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const origin = { x: e.clientX, y: e.clientY };
    let pointer = origin;
    let started = false;
    let target: number | null = null;
    let frame = 0;

    // Scrolls the board while the pointer stays near the edge
    const autoScroll = () => {
      const el = scrollRef.current;
      if (el) {
        const { left, right } = el.getBoundingClientRect();
        if (pointer.x < left + LIST_DRAG_EDGE_PX) el.scrollLeft -= LIST_DRAG_SCROLL_STEP_PX;
        else if (pointer.x > right - LIST_DRAG_EDGE_PX) el.scrollLeft += LIST_DRAG_SCROLL_STEP_PX;
      }
      updateTarget();
      frame = requestAnimationFrame(autoScroll);
    };

    const updateTarget = () => {
      const next = nearestListIndexAtX(listsAt(), pointer.x);
      if (next !== target) {
        target = next;
        setDrag((d) => (d ? { ...d, target: next } : d));
      }
    };

    const move = (ev: PointerEvent) => {
      pointer = { x: ev.clientX, y: ev.clientY };
      if (!started) {
        if (Math.hypot(pointer.x - origin.x, pointer.y - origin.y) < LIST_DRAG_THRESHOLD_PX) return;
        started = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
        target = nearestListIndexAtX(listsAt(), pointer.x);
        setDrag({ key, target, width: rect.width });
        frame = requestAnimationFrame(autoScroll);
      }
      positionRef.current = { x: pointer.x - grab.x, y: pointer.y - grab.y };
      if (previewRef.current) {
        previewRef.current.style.transform = previewTransform(positionRef.current.x, positionRef.current.y);
      }
    };

    const finish = (drop: boolean) => {
      const wasDragging = started;
      cleanup();
      if (!wasDragging) return;
      // The click after the drop must not open "rename" on the header
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }));
      if (drop && target !== null) onDropRef.current(key, target);
    };
    const up = () => finish(true);
    const keydown = (ev: KeyboardEvent) => ev.key === "Escape" && finish(false);

    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", keydown);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDrag(null);
      cleanupRef.current = () => {};
    };
    const cancel = () => finish(false);

    cleanupRef.current();
    cleanupRef.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", keydown);
  };

  // The latest position, so a re-render (new target) doesn't move it back
  const previewStyle = (d: ListDrag): CSSProperties => ({
    width: d.width,
    transform: previewTransform(positionRef.current.x, positionRef.current.y),
  });

  return { drag, onPointerDown, previewRef, previewStyle };
}
