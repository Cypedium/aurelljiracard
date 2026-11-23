'use client';
import { useEffect, useSyncExternalStore } from "react";
import { getIssueTypes } from "../api/endpoints";
import { reportError } from "../utils/apiError";
import { DEFAULT_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from "../utils/cardType";
import { createStore } from "../utils/store";
import { useBoards } from "./useBoards";
import { msg } from "../utils/i18n";

// The shown board's issue types, shared by every component (cards, backlog, forms). Fetched once
// per board and page load; the default types are shown until they have been fetched
let boardId: string | null = null;
let loading: string | null = null;
const store = createStore<IssueType[]>(DEFAULT_ISSUE_TYPES);

const load = (id: string | null) => {
  if (!id || id === boardId || id === loading) return;
  loading = id;
  getIssueTypes(id)
    .then((res) => {
      // The user switched board in the meantime: the response no longer applies
      if (loading !== id) return;
      boardId = id;
      store.set(normalizeIssueTypes(res.data));
    })
    .catch((err) => {
      // Fixed id: several components may retry, and the toast then replaces itself
      reportError("Error fetching issue types", err, msg("Could not load the issue types."), "issue-types");
    })
    .finally(() => {
      if (loading === id) loading = null;
    });
};

// Board admin: a new type shows at once in every dropdown
export const addIssueType = (type: IssueType) =>
  store.set([...store.get().filter((t) => t.key !== type.key), type]);

// Board admin: a deleted type disappears at once from every dropdown
export const removeIssueType = (key: string) => store.set(store.get().filter((t) => t.key !== key));

export function useIssueTypes(): IssueType[] {
  const { current } = useBoards();
  const id = current?._id ?? null;
  useEffect(() => load(id), [id]);
  const types = useSyncExternalStore(store.subscribe, store.get, () => DEFAULT_ISSUE_TYPES);
  // Another board's types are never shown, not even while the new board's types are fetched
  return id && id === boardId ? types : DEFAULT_ISSUE_TYPES;
}
