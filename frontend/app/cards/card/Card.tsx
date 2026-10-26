'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitCard, updateCard, type Card as CardData } from '..//../api/endpoints';
import { isAxiosError } from 'axios';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { PRIORITIES, validateCardForm } from '../../utils/cardForm';
import { CARD_TYPES, cardTypeOf, type CardType } from '../../utils/cardType';
import { FIELD_CLASS, FIELD_FOCUS_CLASS, LABEL_CLASS, SECTION_PADDING } from '../../utils/styles';
import type { CardStatus } from '../../utils/boardLayout';
import IssueTypeIcon from '../../components/IssueTypeIcon';

type CardProps = {
  // Set when editing an existing card; omitted on the create page
  card?: CardData;
  onSaved?: (card: CardData) => void;
  onCancel?: () => void;
  // Board column for a new card ("Add a card" on the board); defaults to To Do
  status?: CardStatus;
  // Called after a new card is created; without it the page redirects home
  onCreated?: () => void;
};

export default function Card({ card, onSaved, onCancel, status, onCreated }: CardProps = {}) {
  const isEdit = Boolean(card?._id);
  const [type, setType] = useState<CardType>(cardTypeOf(card?.type));
  const [rating, setRating] = useState<number>(card?.rating ?? 0);
  const [comment, setComment] = useState<string>(card?.comment ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>(card?.productId ?? '');
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const invalid = validateCardForm({ comment, productId, rating });
    if (invalid) {
      setMessage(invalid);
      return;
    }

    // The backend sets the date (today) when the card is created
    const fields = { type, rating, comment, productId };

    if (isEdit && card?._id) {
      try {
        const res = await updateCard(card._id, fields);
        onSaved?.(res.data);
      } catch (error) {
        console.error('Update error:', error);
        const serverMessage = isAxiosError(error) ? error.response?.data?.message : null;
        setMessage(serverMessage || 'Failed to save card.');
      }
      return;
    }

    try {
      // Author is taken from the access token by the backend
      const res = await submitCard({ ...fields, status });

      if (onCreated) {
        onCreated();
        return;
      }

      setMessage(res.data.message || 'Card submitted!');
      setRating(0);
      setComment('');
      setProductId('');
      setType(cardTypeOf());

      setTimeout(() => {
        router.push("/");
      }, 5000);

    } catch (error) {
      console.error('Submission error:', error);
      const serverMessage = isAxiosError(error) ? error.response?.data?.message : null;
      setMessage(serverMessage || 'Failed to submit card.');
    }
  };

  return (
    <form
      className="mx-auto my-6 w-full max-w-[640px] overflow-hidden rounded-xl bg-white font-jira text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] max-[480px]:my-3"
      onSubmit={handleSubmit}
    >
      {/* Samma gradient som boarden */}
      <header className={`${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`}>
        <h2 className="text-xl font-semibold text-white" id="card-form-title">
          {isEdit ? 'Edit card' : 'Create card'}
        </h2>
      </header>

      <div className={`${SECTION_PADDING} flex flex-col pt-4 pb-4`}>
        <p className="text-xs text-jira-secondary">
          Required fields are marked with an asterisk <span className="text-jira-danger">*</span>
        </p>
        <label className={LABEL_CLASS} htmlFor="issueType">
          Issue type <span className="text-jira-danger">*</span>
        </label>
        {/* Native select (tangentbord och mobil fungerar), ikonen visar vald typ */}
        <div className="relative inline-flex items-center self-start rounded-lg bg-list-test text-list-test-text hover:bg-[#b3d2ff] focus-within:shadow-[0_0_0_2px_var(--color-jira-focus)]">
          <span className="pointer-events-none absolute left-2">
            <IssueTypeIcon type={type} />
          </span>
          <select
            id="issueType"
            className="cursor-pointer appearance-none bg-transparent py-1 pr-8 pl-8 font-medium outline-none"
            value={type}
            onChange={(e) => setType(cardTypeOf(e.target.value))}
          >
            {CARD_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 size-4" aria-hidden />
        </div>

        <label className={LABEL_CLASS} htmlFor="summary">
          Summary <span className="text-jira-danger">*</span>
        </label>
        <textarea
          id="summary"
          className={`${FIELD_CLASS} ${FIELD_FOCUS_CLASS} min-h-[88px] resize-y p-2`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What needs to be done?"
          required
        />

        <label className={LABEL_CLASS} htmlFor="issueKey">
          Issue key <span className="text-jira-danger">*</span>
        </label>
        <input
          id="issueKey"
          className={`${FIELD_CLASS} ${FIELD_FOCUS_CLASS} p-2`}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="e.g. AGB-12"
          required
        />

        <span className={LABEL_CLASS} id="priority-label">
          Time tracking <span className="text-jira-danger">*</span>
        </span>
        <div className="flex gap-2" role="group" aria-labelledby="priority-label">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              className={`h-8 min-w-9 rounded-full font-semibold ${
                p === rating
                  ? 'bg-board-via text-white'
                  : 'bg-jira-neutral text-jira-text hover:bg-jira-neutral-hover'
              }`}
              aria-pressed={p === rating}
              onClick={() => setRating(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-4 rounded-[3px] bg-jira-info px-3 py-2 text-jira-text">{message}</p>
        )}
      </div>

      <footer className={`${SECTION_PADDING} flex justify-end gap-2 pt-4 pb-6`}>
        <button
          type="button"
          className="h-8 rounded-lg px-3 font-medium text-jira-secondary hover:bg-jira-lane"
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </button>
        <button
          className="h-8 rounded-lg bg-board-via px-4 font-medium text-white hover:bg-board-from"
          type="submit"
        >
          {isEdit ? 'Save' : 'Create'}
        </button>
      </footer>
    </form>
  );
}
