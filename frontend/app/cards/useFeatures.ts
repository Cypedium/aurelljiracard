'use client';
import { useEffect, useSyncExternalStore } from "react";
import { onServiceUnavailable } from "../api/api";
import { getFeatures } from "../api/endpoints";
import { logError } from "../utils/apiError";
import { ALL_ON, canWrite, isFeatureOn, parseFeatureState, type FeatureKey, type FeatureState } from "../utils/features";
import { isAdmin } from "../utils/session";

// Feature switches och read-only-läge, delade av navbaren och sidorna (docs/feature-switches.md).
// Hämtas vid första användningen, när fönstret får fokus igen och efter varje 503. Misslyckas hämtningen är allt på
let state: FeatureState = ALL_ON;
let started = false;
let loading = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const reloadFeatures = async () => {
  if (loading) return;
  loading = true;
  try {
    state = parseFeatureState((await getFeatures()).data);
    emit();
  } catch (err) {
    // Tyst: en backend utan /feature (Express) ska inte störa
    logError("Error fetching features", err);
  } finally {
    loading = false;
  }
};

// Efter att admin ändrat en brytare: visa svaret direkt
export const setFeatureState = (next: FeatureState) => {
  state = next;
  emit();
};

const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  reloadFeatures();
  window.addEventListener("focus", () => reloadFeatures());
  onServiceUnavailable(() => reloadFeatures());
};

export function useFeatures() {
  useEffect(start, []);
  const snapshot = useSyncExternalStore(subscribe, () => state, () => ALL_ON);
  const siteAdmin = isAdmin();
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
