'use client';
import { useSyncExternalStore } from "react";
import { SIGNED_OUT, onSessionChange, sessionSnapshot, type SessionSnapshot } from "../utils/session";

// Logged in, username and the site admin role. Updated at once on login, refreshed tokens and
// logout. Logged out on the server (sessionStorage only exists in the browser)
export function useSession(): SessionSnapshot {
  return useSyncExternalStore(onSessionChange, sessionSnapshot, () => SIGNED_OUT);
}
