'use client';
import { useEffect, useSyncExternalStore } from "react";
import { onServiceUnavailable } from "../api/api";
import { getFeatures } from "../api/endpoints";
import { logError } from "../utils/apiError";
import { ALL_ON, canWrite, isFeatureOn, parseFeatureState, type FeatureKey, type FeatureState } from "../utils/features";
import { createStore } from "../utils/store";
import { useSession } from "./useSession";

// Feature switches and read-only mode, shared by the navbar and the pages (docs/feature-switches.md).
// Fetched on first use, when the window gets focus again and after every 503. If fetching fails everything is on
const store = createStore<FeatureState>(ALL_ON);
let started = false;
let loading = false;

export const reloadFeatures = async () => {
  if (loading) return;
  loading = true;
  try {
    store.set(parseFeatureState((await getFeatures()).data));
  } catch (err) {
    // Silent: a failed call means everything is on
    logError("Error fetching features", err);
  } finally {
    loading = false;
  }
};

// After the admin changed a switch: show the response at once
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
  // The role from the access token; follows login/logout and refreshed tokens
  const { admin: siteAdmin } = useSession();
  return {
    state: snapshot,
    // Read-only mode is on (everyone sees the banner; the site admin gets a different text)
    readOnly: snapshot.readOnly,
    siteAdmin,
    isOn: (key: FeatureKey) => isFeatureOn(snapshot, key, siteAdmin),
    // Writes without their own switch, e.g. saving the order of the cards
    canWrite: canWrite(snapshot, siteAdmin),
  };
}
