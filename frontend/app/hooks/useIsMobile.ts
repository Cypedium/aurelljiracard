'use client';
import { useSyncExternalStore } from "react";

// The same breakpoint as Tailwind's md (48rem): below it one list is shown per screen
const MOBILE_QUERY = "(max-width: 47.99rem)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// true on mobile; false on the server (the board is first drawn in the browser)
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}
