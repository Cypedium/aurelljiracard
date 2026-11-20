'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, TrashIcon } from '@heroicons/react/16/solid';
import { deleteCard, getCards, updateCardStatus, type Card } from '../api/endpoints';
import { CardFormDialog, DeleteCardDialog } from '../cards/board/CardDialogs';
import { reportError } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { backlogCards } from '../utils/backlog';
import { DEFAULT_HEADERS } from '../utils/boardLayout';
import { formatShortDate } from '../utils/date';
import { canDeleteCard, canEditCard } from '../utils/session';
import { useSession } from '../hooks/useSession';
import { useFeatures } from '../hooks/useFeatures';
import { useBoards } from '../hooks/useBoards';
import { CARD_ACTION_CLASS, TABLE_CELL_CLASS as TD_CLASS, TABLE_HEAD_CLASS as TH_CLASS, TABLE_THEAD_CLASS, TABLE_ROW_CLASS, TABLE_WRAPPER_CLASS } from '../utils/styles';
import IssueTypeIcon from './IssueTypeIcon';
import TableSkeleton from './TableSkeleton';
import { Button } from './ui/button';
import { toPlainLine, toPlainText } from '../utils/summaryFormat';

type BacklogListProps = {
  // Changed by the parent to fetch the list again (e.g. after a card was added)
  refreshKey?: number;
  // Called when a card has been moved to the board
  onMoved?: (card: Card) => void;
};

// Cards are taken from the backlog to the first column (To Do) and assigned to whoever moves them
const TARGET_STATUS = DEFAULT_HEADERS[0].key;

export default function BacklogList({ refreshKey = 0, onMoved }: BacklogListProps) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  // The same edit and delete dialogs as on the board
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  const { username: userName } = useSession();
  // The selected board's backlog; the board's admin may edit and delete every card
  const { current, boardAdmin: admin } = useBoards();
  // Switched-off features are hidden; moving to the board is editCard
  const { isOn } = useFeatures();
  const boardId = current?._id ?? null;

  const fetchBacklog = useCallback(async () => {
    if (!boardId) return;
    try {
      const res = await getCards(boardId);
      setCards(backlogCards(res.data || []));
    } catch (err) {
      reportError('Error fetching backlog', err, 'Could not load the backlog.');
      setCards([]);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog, refreshKey]);

  const moveToBoard = async (card: Card) => {
    if (!card._id || !boardId) return;
    setMovingId(card._id);
    try {
      const res = await updateCardStatus(boardId, card._id, TARGET_STATUS);
      setCards((prev) => prev?.filter((c) => c._id !== card._id) ?? null);
      toast.success(`${card.productId} moved to the board and assigned to you.`);
      onMoved?.(res.data);
    } catch (err) {
      reportError('Error moving card', err, 'Could not move card.');
    } finally {
      setMovingId(null);
    }
  };

  const handleCardSaved = (updated: Card) => {
    // Moved to a list in the edit dialog: the card leaves the backlog
    setCards((prev) => (prev ? backlogCards(prev.map((c) => (c._id === updated._id ? updated : c))) : null));
    setEditingCard(null);
  };

  const removeCard = async (id: string) => {
    if (!boardId) return;
    try {
      await deleteCard(boardId, id);
      setCards((prev) => prev?.filter((c) => c._id !== id) ?? null);
    } catch (err) {
      reportError('Error deleting card', err, 'Could not delete card.');
    }
  };

  if (cards === null) return <TableSkeleton />;

  if (cards.length === 0) {
    return <p className="rounded-lg bg-white p-6 text-center text-sm text-jira-secondary">The backlog is empty.</p>;
  }

  // Mobile: Created and Reporter are hidden so the table fits
  return (
    <>
      <div className={TABLE_WRAPPER_CLASS}>
        {/* Small columns get their content width; Summary takes the rest and is cut off with … */}
        <table className="w-full text-sm text-jira-text [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead className={TABLE_THEAD_CLASS}>
            <tr>
              <th scope="col" className={TH_CLASS}>Key</th>
              <th scope="col" className={TH_CLASS}>Summary</th>
              <th scope="col" className={`${TH_CLASS} text-center`}>Priority</th>
              <th scope="col" className={`${TH_CLASS} max-[480px]:hidden`}>Created</th>
              <th scope="col" className={`${TH_CLASS} text-center max-[480px]:hidden`}>Reporter</th>
              <th scope="col" className={TH_CLASS}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card._id} className={`group ${TABLE_ROW_CLASS}`}>
                <td className={TD_CLASS}>
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type={card.type} />
                    <span className="text-xs font-semibold uppercase text-jira-secondary">{card.productId}</span>
                  </div>
                </td>
                <td className={`${TD_CLASS} w-full max-w-0 truncate`} title={toPlainText(card.comment)}>
                  {toPlainLine(card.comment)}
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  <span
                    className="inline-block min-w-5 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
                    title={`Priority: ${card.rating}/5`}
                  >
                    {card.rating}
                  </span>
                </td>
                <td className={`${TD_CLASS} text-xs text-jira-secondary tabular-nums max-[480px]:hidden`}>
                  <time dateTime={card.submittedAt}>{formatShortDate(card.submittedAt)}</time>
                </td>
                <td className={`${TD_CLASS} text-center max-[480px]:hidden`}>
                  <span
                    className="inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ background: avatarColor(card.username) }}
                    title={`Created by ${card.username}`}
                  >
                    {avatarInitials(card.username)}
                  </span>
                </td>
                <td className={`${TD_CLASS} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    {/* Edit and delete on your own cards, or all of them for the admin (shown on hover, as on the board) */}
                    {canEditCard(card) && isOn('editCard') && (
                      <button className={CARD_ACTION_CLASS} aria-label="Edit card" title="Edit" onClick={() => setEditingCard(card)}>
                        <PencilIcon className="size-4" aria-hidden />
                      </button>
                    )}
                    {canDeleteCard(card, userName, admin) && isOn('deleteCard') && (
                      <button className={CARD_ACTION_CLASS} aria-label="Delete card" title="Delete" onClick={() => setDeletingCard(card)}>
                        <TrashIcon className="size-4" aria-hidden />
                      </button>
                    )}
                    {isOn('editCard') && (
                      <Button size="sm" disabled={movingId === card._id} onClick={() => moveToBoard(card)}>
                        Move to board
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CardFormDialog
        editingCard={editingCard}
        creatingIn={null}
        onSaved={handleCardSaved}
        onCreated={() => setEditingCard(null)}
        onClose={() => setEditingCard(null)}
      />
      <DeleteCardDialog card={deletingCard} onClose={() => setDeletingCard(null)} onConfirm={removeCard} />
    </>
  );
}
