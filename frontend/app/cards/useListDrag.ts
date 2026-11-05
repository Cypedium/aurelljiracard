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

// Listan som dras, dess bredd (för förhandsvisningen) och platsen (index) pekaren är över
export type ListDrag = {
  key: CardStatus;
  target: number | null;
  width: number;
};

type Options = {
  // Elementet som scrollar i sidled; scrollar när pekaren är nära kanten
  scrollRef: RefObject<HTMLElement | null>;
  // toIndex: platsen i listornas ordning
  onDrop: (from: CardStatus, toIndex: number) => void;
};

const previewTransform = (x: number, y: number) => `translate(${x}px, ${y}px) rotate(${LIST_DRAG_TILT_DEG}deg)`;

// Admin: dra en lista i rubriken med musen, som i Trello. Den lyfta listan följer pekaren
// (previewRef flyttas utan omrendering); platsen den är över blir target. Platsen räknas i
// boardens aktuella ordning, där den lyfta listan redan står på target, så att den inte hoppar fram och tillbaka.
// Escape avbryter
export function useListDrag({ scrollRef, onDrop }: Options) {
  const [drag, setDrag] = useState<ListDrag | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  // Förhandsvisningens position; ändras utan omrendering
  const positionRef = useRef({ x: 0, y: 0 });
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => () => cleanupRef.current(), []);

  // Listorna i dokumentordning = boardens ordning
  const listsAt = () =>
    Array.from(document.querySelectorAll<HTMLElement>(`[${LIST_KEY_ATTR}]`), (el) => el.getBoundingClientRect());

  const onPointerDown = (key: CardStatus) => (e: ReactPointerEvent<HTMLElement>) => {
    // Bara mus/penna: på touch sveper man mellan listorna
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

    // Scrollar boarden medan pekaren står nära kanten
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
      // Klicket efter släppet ska inte öppna "byt namn" på rubriken
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

  // Senaste positionen, så att en omrendering (nytt target) inte flyttar tillbaka den
  const previewStyle = (d: ListDrag): CSSProperties => ({
    width: d.width,
    transform: previewTransform(positionRef.current.x, positionRef.current.y),
  });

  return { drag, onPointerDown, previewRef, previewStyle };
}
