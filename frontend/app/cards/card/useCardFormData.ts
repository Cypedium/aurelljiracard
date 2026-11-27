import { useCallback, useEffect, useState } from 'react';
import { getCards, getColumns } from '../../api/endpoints';
import { logError } from '../../utils/apiError';
import { takenIssueKeys } from '../../utils/cardForm';
import { normalizeColumns, type BoardHeader } from '../../utils/boardLayout';

// What the card form loads from the board: the issue keys already in use (except the card's own) and the lists.
// If either fails the form still works: the server's 409 catches duplicates, and the list select stays empty
export function useCardFormData(boardId: string | null, cardId: string | undefined) {
  // So a duplicate key shows under the field while typing
  const [takenKeys, setTakenKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!boardId) return;
    getCards(boardId)
      .then((res) => setTakenKeys(takenIssueKeys(res.data || [], cardId)))
      .catch((err) => logError('Fetch issue keys error', err));
  }, [boardId, cardId]);

  // The dropdown next to Issue type. A moved card lands at the top of its new list (see buildCardLayout)
  const [lists, setLists] = useState<BoardHeader[]>([]);
  useEffect(() => {
    if (!boardId) return;
    getColumns(boardId)
      .then((res) => setLists(normalizeColumns(res.data)))
      .catch((err) => logError('Fetch lists error', err));
  }, [boardId]);

  // A key someone else took after the form opened (the server answered 409)
  const addTakenKey = useCallback((key: string) => setTakenKeys((prev) => new Set(prev).add(key)), []);

  return { takenKeys, addTakenKey, lists };
}
