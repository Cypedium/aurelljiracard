'use client';
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getIssueTypes } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { DEFAULT_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from "../utils/cardType";
import { hasSession } from "../utils/session";

// Ärendetyperna delas av alla komponenter (kort, backlog, formulär) och hämtas en gång per sidladdning.
// Standardtyperna visas tills de har hämtats
let issueTypes: IssueType[] = DEFAULT_ISSUE_TYPES;
let loading = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const load = () => {
  // Utan inloggning svarar API:t 401; hämtas när en inloggad sida visas
  if (loading || !hasSession()) return;
  loading = true;
  getIssueTypes()
    .then((res) => {
      issueTypes = normalizeIssueTypes(res.data);
      emit();
    })
    .catch((err) => {
      console.error("Error fetching issue types:", err.message);
      // Fast id: flera komponenter kan försöka igen, då ersätter toasten sig själv
      toast.error(apiErrorMessage(err, "Could not load the issue types."), { id: "issue-types" });
      loading = false;
    });
};

// Admin: en ny typ syns direkt i alla dropdowns
export const addIssueType = (type: IssueType) => {
  issueTypes = [...issueTypes.filter((t) => t.key !== type.key), type];
  emit();
};

// Admin: en borttagen typ försvinner direkt ur alla dropdowns
export const removeIssueType = (key: string) => {
  issueTypes = issueTypes.filter((t) => t.key !== key);
  emit();
};

export function useIssueTypes(): IssueType[] {
  useEffect(load, []);
  return useSyncExternalStore(subscribe, () => issueTypes, () => DEFAULT_ISSUE_TYPES);
}
