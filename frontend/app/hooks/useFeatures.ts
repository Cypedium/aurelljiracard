'use client';
import { useEffect, useState, useSyncExternalStore } from "react";
import { onServiceUnavailable } from "../api/api";
import { getFeatures } from "../api/endpoints";
import { logError } from "../utils/apiError";
import { ALL_ON, canWrite, isFeatureOn, parseFeatureState, type FeatureKey, type FeatureState } from "../utils/features";
import { isAdmin } from "../utils/session";
import { createStore } from "../utils/store";

// Feature switches och read-only-läge, delade av navbaren och sidorna (docs/feature-switches.md).
// Hämtas vid första användningen, när fönstret får fokus igen och efter varje 503. Misslyckas hämtningen är allt på
const store = createStore<FeatureState>(ALL_ON);
let started = false;
let loading = false;

export const reloadFeatures = async () => {
  if (loading) return;
  loading = true;
  try {
    store.set(parseFeatureState((await getFeatures()).data));
  } catch (err) {
    // Tyst: ett misslyckat anrop betyder att allt är på
    logError("Error fetching features", err);
  } finally {
    loading = false;
  }
};

// Efter att admin ändrat en brytare: visa svaret direkt
export const setFeatureState = (next: FeatureState) => store.set(next);

const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  reloadFeatures();
  window.addEventListener("focus", () => reloadFeatures());
  onServiceUnavailable(() => reloadFeatures());
};

export function useFeatures() {
  useEffect(start, []);
  const snapshot = useSyncExternalStore(store.subscribe, store.get, () => ALL_ON);
  // Rollen ligger i sessionStorage: läses efter mount (inte vid serverrenderingen) och vid varje ny hämtning,
  // så att en in-/utloggning syns
  const [siteAdmin, setSiteAdmin] = useState(false);
  useEffect(() => setSiteAdmin(isAdmin()), [snapshot]);
  return {
    state: snapshot,
    // Read-only-läget är på (bannern visas för alla; sajtens admin får en annan text)
    readOnly: snapshot.readOnly,
    siteAdmin,
    isOn: (key: FeatureKey) => isFeatureOn(snapshot, key, siteAdmin),
    // Skrivningar utan egen brytare, t.ex. att spara kortens ordning
    canWrite: canWrite(snapshot, siteAdmin),
  };
}
