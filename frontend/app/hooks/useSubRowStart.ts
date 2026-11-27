import { useLayoutEffect, useState, type DependencyList, type RefObject } from 'react';

// The navbar's second row starts under the current page's link (Board / Backlog / Issue types): its left edge
// in pixels from the header's left edge. null = left-aligned (no row, or mobile where the link is hidden).
// Re-measured when the window, the fonts or the links change; deps = what changes the links
export function useSubRowStart(headerRef: RefObject<HTMLElement | null>, enabled: boolean, deps: DependencyList) {
  const [start, setStart] = useState<number | null>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const link = enabled ? header?.querySelector<HTMLElement>('a[aria-current="page"]') : null;
    if (!link || !header) {
      setStart(null);
      return;
    }
    const measure = () => {
      const rect = link.getBoundingClientRect();
      setStart(rect.width ? rect.left - header.getBoundingClientRect().left : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(link);
    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef, enabled, ...deps]);

  return start;
}
