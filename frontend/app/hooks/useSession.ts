'use client';
import { useSyncExternalStore } from "react";
import { SIGNED_OUT, onSessionChange, sessionSnapshot, type SessionSnapshot } from "../utils/session";

// Inloggad, användarnamn och sajtens admin-roll. Uppdateras direkt vid inloggning, förnyade tokens och
// utloggning. Utloggad på servern (sessionStorage finns bara i webbläsaren)
export function useSession(): SessionSnapshot {
  return useSyncExternalStore(onSessionChange, sessionSnapshot, () => SIGNED_OUT);
}
