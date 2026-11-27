import { useEffect } from 'react';
import { BOARD_ACTIONS, onBoardAction } from '../utils/boardActions';
import type { CardStatus } from '../utils/boardLayout';

type Options = {
  // The board's admin (its owner): only they get "Create column" and "Delete column"
  admin: boolean;
  // Where the navbar's "Create card" puts a new card; null until the lists have loaded
  firstListKey: CardStatus | null;
  // State setters (stable), so the listeners are only replaced when admin or the first list changes
  setCreatingIn: (listKey: CardStatus | null) => void;
  setAddingList: (open: boolean) => void;
  setDeletingList: (open: boolean) => void;
};

// The navbar's buttons for the board: "Create card" (a new card in the first list) and, for the admin,
// "Create column" (the form at the end of the board) and "Delete column" (the dialog where an empty list is picked)
export function useBoardActionHandlers({ admin, firstListKey, setCreatingIn, setAddingList, setDeletingList }: Options) {
  useEffect(
    () => onBoardAction(BOARD_ACTIONS.createCard, () => setCreatingIn(firstListKey)),
    [firstListKey, setCreatingIn],
  );
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.createColumn, () => setAddingList(true));
  }, [admin, setAddingList]);
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.deleteColumn, () => setDeletingList(true));
  }, [admin, setDeletingList]);
}
