'use client';
import { useEffect, useRef, useState, type RefObject } from "react";

// Horisontell scrollbar ovanför ett scrollområde, synkad med det i båda riktningarna
export default function TopScrollbar({
  target,
  className = "",
}: {
  target: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = target.current;
    const bar = barRef.current;
    if (!el || !bar) return;

    const measure = () => {
      setScrollWidth(el.scrollWidth);
      setOverflowing(el.scrollWidth > el.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    measure();

    // Sätts bara när värdet skiljer sig, så händelserna studsar inte fram och tillbaka
    const fromTarget = () => {
      if (bar.scrollLeft !== el.scrollLeft) bar.scrollLeft = el.scrollLeft;
    };
    const fromBar = () => {
      if (el.scrollLeft !== bar.scrollLeft) el.scrollLeft = bar.scrollLeft;
    };
    el.addEventListener("scroll", fromTarget, { passive: true });
    bar.addEventListener("scroll", fromBar, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", fromTarget);
      bar.removeEventListener("scroll", fromBar);
    };
  }, [target]);

  return (
    <div
      ref={barRef}
      aria-hidden
      className={`board-scroll overflow-x-auto overflow-y-hidden ${overflowing ? "" : "invisible"} ${className}`}
    >
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}
