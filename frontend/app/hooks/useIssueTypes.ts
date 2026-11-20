'use client';
import { useEffect, useSyncExternalStore } from "react";
import { getIssueTypes } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import { DEFAULT_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from "../utils/cardType";
import { createStore } from "../utils/store";
import { useBoards } from "./useBoards";

// Den visade boardens ärendetyper, delade av alla komponenter (kort, backlog, formulär). Hämtas en gång
// per board och sidladdning; standardtyperna visas tills de har hämtats
let boardId: string | null = null;
let loading: string | null = null;
const store = createStore<IssueType[]>(DEFAULT_ISSUE_TYPES);

const load = (id: string | null) => {
  if (!id || id === boardId || id === loading) return;
  loading = id;
  getIssueTypes(id)
    .then((res) => {
      // Användaren hann byta board: svaret gäller inte längre
      if (loading !== id) return;
      boardId = id;
      store.set(normalizeIssueTypes(res.data));
    })
    .catch((err) => {
      // Fast id: flera komponenter kan försöka igen, då ersätter toasten sig själv
      reportError("Error fetching issue types", err, "Could not load the issue types.", "issue-types");
    })
    .finally(() => {
      if (loading === id) loading = null;
    });
};

// Board admin: en ny typ syns direkt i alla dropdowns
export const addIssueType = (type: IssueType) =>
  store.set([...store.get().filter((t) => t.key !== type.key), type]);

// Board admin: en borttagen typ försvinner direkt ur alla dropdowns
export const removeIssueType = (key: string) => store.set(store.get().filter((t) => t.key !== key));

export function useIssueTypes(): IssueType[] {
  const { current } = useBoards();
  const id = current?._id ?? null;
  useEffect(() => load(id), [id]);
  const types = useSyncExternalStore(store.subscribe, store.get, () => DEFAULT_ISSUE_TYPES);
  // En annan boards typer visas aldrig, inte ens medan den nya boardens hämtas
  return id && id === boardId ? types : DEFAULT_ISSUE_TYPES;
}
