'use client';
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getIssueTypes } from "../api/endpoints";
import { apiErrorMessage } from "../utils/apiError";
import { DEFAULT_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from "../utils/cardType";
import { useBoards } from "./useBoards";

// Den visade boardens ärendetyper, delade av alla komponenter (kort, backlog, formulär). Hämtas en gång
// per board och sidladdning; standardtyperna visas tills de har hämtats
let boardId: string | null = null;
let issueTypes: IssueType[] = DEFAULT_ISSUE_TYPES;
let loading: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const load = (id: string | null) => {
  if (!id || id === boardId || id === loading) return;
  loading = id;
  getIssueTypes(id)
    .then((res) => {
      // Användaren hann byta board: svaret gäller inte längre
      if (loading !== id) return;
      boardId = id;
      issueTypes = normalizeIssueTypes(res.data);
      emit();
    })
    .catch((err) => {
      console.error("Error fetching issue types:", err.message);
      // Fast id: flera komponenter kan försöka igen, då ersätter toasten sig själv
      toast.error(apiErrorMessage(err, "Could not load the issue types."), { id: "issue-types" });
    })
    .finally(() => {
      if (loading === id) loading = null;
    });
};

// Board admin: en ny typ syns direkt i alla dropdowns
export const addIssueType = (type: IssueType) => {
  issueTypes = [...issueTypes.filter((t) => t.key !== type.key), type];
  emit();
};

// Board admin: en borttagen typ försvinner direkt ur alla dropdowns
export const removeIssueType = (key: string) => {
  issueTypes = issueTypes.filter((t) => t.key !== key);
  emit();
};

export function useIssueTypes(): IssueType[] {
  const { current } = useBoards();
  const id = current?._id ?? null;
  useEffect(() => load(id), [id]);
  const types = useSyncExternalStore(subscribe, () => issueTypes, () => DEFAULT_ISSUE_TYPES);
  // En annan boards typer visas aldrig, inte ens medan den nya boardens hämtas
  return id && id === boardId ? types : DEFAULT_ISSUE_TYPES;
}
