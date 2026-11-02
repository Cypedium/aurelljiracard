'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getCards, updateCardStatus, type Card } from '../api/endpoints';
import { apiErrorMessage } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { backlogCards } from '../utils/backlog';
import { DEFAULT_HEADERS } from '../utils/boardLayout';
import IssueTypeIcon from './IssueTypeIcon';
import { Button } from './ui/button';

type BacklogListProps = {
  // Ändras av föräldern för att hämta listan igen (t.ex. efter att ett kort lagts till)
  refreshKey?: number;
  // Anropas när ett kort har flyttats till boarden
  onMoved?: (card: Card) => void;
};

// Kort tas från backloggen till första kolumnen (To Do) och tilldelas den som flyttar
const TARGET_STATUS = DEFAULT_HEADERS[0].key;

export default function BacklogList({ refreshKey = 0, onMoved }: BacklogListProps) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchBacklog = useCallback(async () => {
    try {
      const res = await getCards();
      setCards(backlogCards(res.data || []));
    } catch (err: any) {
      console.error('Error fetching backlog:', err.message);
      toast.error(apiErrorMessage(err, 'Could not load the backlog.'));
      setCards([]);
    }
  }, []);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog, refreshKey]);

  const moveToBoard = async (card: Card) => {
    if (!card._id) return;
    setMovingId(card._id);
    try {
      const res = await updateCardStatus(card._id, TARGET_STATUS);
      setCards((prev) => prev?.filter((c) => c._id !== card._id) ?? null);
      toast.success(`${card.productId} moved to the board and assigned to you.`);
      onMoved?.(res.data);
    } catch (err: any) {
      console.error('Error moving card:', err.message);
      toast.error(apiErrorMessage(err, 'Could not move card.'));
    } finally {
      setMovingId(null);
    }
  };

  if (cards === null) return null;

  if (cards.length === 0) {
    return <p className="rounded-lg bg-white p-6 text-center text-sm text-jira-secondary">The backlog is empty.</p>;
  }

  return (
    <ul className="overflow-hidden rounded-lg bg-white shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
      {cards.map((card) => (
        <li
          key={card._id}
          className="flex items-center gap-3 border-b border-jira-neutral px-4 py-3 text-sm text-jira-text last:border-b-0 max-[480px]:flex-wrap"
        >
          <IssueTypeIcon type={card.type} />
          <span className="w-16 shrink-0 text-xs font-semibold uppercase text-jira-secondary">{card.productId}</span>
          <span className="min-w-0 flex-1 truncate" title={card.comment}>
            {card.comment}
          </span>
          <span
            className="min-w-5 shrink-0 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
            title={`Priority: ${card.rating}/5`}
          >
            {card.rating}
          </span>
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ background: avatarColor(card.username) }}
            title={`Created by ${card.username}`}
          >
            {avatarInitials(card.username)}
          </span>
          <Button size="sm" disabled={movingId === card._id} onClick={() => moveToBoard(card)}>
            Move to board
          </Button>
        </li>
      ))}
    </ul>
  );
}
