'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitCard, updateCard, type Card as CardData } from '..//../api/endpoints';
import DatePicker, { registerLocale } from 'react-datepicker';
import { sv } from 'date-fns/locale/sv';
import { isAxiosError } from 'axios';
import { CalendarIcon, CheckIcon } from '@heroicons/react/16/solid';
import { PRIORITIES, validateCardForm } from '../../utils/cardForm';
import { FIELD_CLASS, FIELD_FOCUS_CLASS, LABEL_CLASS, SECTION_PADDING } from '../../utils/styles';
import type { CardStatus } from '../../utils/boardLayout';


registerLocale('sv', sv);

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    card ? new Date(card.submittedAt) : null
  );
  const [rating, setRating] = useState<number>(card?.rating ?? 0);
  const [comment, setComment] = useState<string>(card?.comment ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>(card?.productId ?? '');
  const router = useRouter();
  const datePickerRef = useRef<any>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const invalid = validateCardForm({ comment, productId, rating });
    if (invalid) {
      setMessage(invalid);
      return;
    }

    const fields = {
      rating,
      comment,
      productId,
      submittedAt: selectedDate?.toISOString() || new Date().toISOString()
    };

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
      setSelectedDate(null);

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
        <p className="mb-3 text-xs text-jira-secondary">
          Required fields are marked with an asterisk <span className="text-jira-danger">*</span>
        </p>
        <span className="inline-flex items-center gap-2 self-start rounded-lg bg-list-test px-2 py-1 font-medium text-list-test-text">
          <span
            className="inline-flex size-4 items-center justify-center rounded-[3px] bg-board-via text-white"
            aria-hidden
          >
            <CheckIcon className="size-3" />
          </span>
          Task
        </span>

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

        <label className={LABEL_CLASS} htmlFor="date">
          Date <span className="text-jira-danger">*</span>
        </label>
        <div
          className={`${FIELD_CLASS} flex items-center pr-1 pl-2 focus-within:border-jira-focus focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_var(--color-jira-focus)]`}
        >
          <DatePicker
            ref={datePickerRef}
            id="date"
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="yyyy-mm-dd"
            required
            locale="sv"
            className="w-full cursor-pointer bg-transparent py-2 outline-none"
            wrapperClassName="flex-1"
            maxDate={new Date()}
          />
          <button
            type="button"
            className="rounded-[3px] px-2 py-1.5 text-jira-secondary hover:bg-jira-neutral"
            aria-label="Open calendar"
            onClick={() => datePickerRef.current?.setOpen(true)}
          >
            <CalendarIcon className="size-4" aria-hidden />
          </button>
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
