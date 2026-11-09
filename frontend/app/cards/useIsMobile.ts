'use client';
import { useSyncExternalStore } from "react";

// Samma gräns som Tailwinds md (48rem): under den visas en lista per skärm
const MOBILE_QUERY = "(max-width: 47.99rem)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// true på mobil; false på servern (boarden ritas först i webbläsaren)
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}
