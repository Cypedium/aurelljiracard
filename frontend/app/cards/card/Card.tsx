'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCards, getColumns, submitCard, updateCard, updateCardStatus, type Card as CardData } from '../../api/endpoints';
import { toast } from 'sonner';
import { useBoards } from '../../hooks/useBoards';
import {
  DUPLICATE_ERROR_TYPE,
  DUPLICATE_PRODUCT_ID_MESSAGE,
  EMPTY_CARD_FORM,
  ISSUE_KEY_CHECK_DELAY_MS,
  PRIORITIES,
  PRODUCT_ID_MAX_LENGTH,
  cardFormSchema,
  cardToFormValues,
  formListKey,
  takenIssueKeys,
  type CardFormValues,
} from '../../utils/cardForm';
import { apiErrorMessage, isConflictError, logError, reportError } from '../../utils/apiError';
import { formatDate } from '../../utils/date';
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, SECTION_PADDING } from '../../utils/styles';
import { BACKLOG_STATUS, type AnyCardStatus } from '../../utils/backlog';
import { normalizeColumns, type BoardHeader, type CardStatus } from '../../utils/boardLayout';
import IssueTypeSelect from '../../components/IssueTypeSelect';
import ListSelect from '../../components/ListSelect';
import { Button } from '../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import SummaryEditor from '../../components/SummaryEditor';
import { ROUTES } from '../../utils/routes';

type CardProps = {
  // Set when editing an existing card; omitted on the create page
  card?: CardData;
  onSaved?: (card: CardData) => void;
  onCancel?: () => void;
  // Board column for a new card ("Add a card" on the board) or "backlog"; defaults to To Do
  status?: AnyCardStatus;
  // Called after a new card is created; without it the page redirects home
  onCreated?: () => void;
};

const required = <span className="text-jira-danger">*</span>;

export default function Card({ card, onSaved, onCancel, status, onCreated }: CardProps = {}) {
  const isEdit = Boolean(card?._id);
  const router = useRouter();
  // The form is only shown on a board page, once the board has loaded
  const boardId = useBoards().current?._id ?? null;
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: card ? cardToFormValues(card) : EMPTY_CARD_FORM,
  });

  // Issue keys already in use, so a duplicate shows under the field while typing.
  // If they can't be loaded, the server's 409 still catches duplicates
  const [takenKeys, setTakenKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!boardId) return;
    getCards(boardId)
      .then((res) => setTakenKeys(takenIssueKeys(res.data || [], card?._id)))
      .catch((err) => logError('Fetch issue keys error', err));
  }, [boardId, card?._id]);

  // The board's lists for the dropdown next to Issue type. The card moves when you save
  // and then lands at the top of the new list (see buildCardLayout)
  const [lists, setLists] = useState<BoardHeader[]>([]);
  useEffect(() => {
    if (!boardId) return;
    getColumns(boardId)
      .then((res) => setLists(normalizeColumns(res.data)))
      .catch((err) => logError('Fetch lists error', err));
  }, [boardId]);
  // null = not changed: the card stays where it is (new card: the list it is created in)
  const [movedTo, setMovedTo] = useState<CardStatus | null>(null);
  const currentStatus = card ? card.status : status;
  const selectedList = movedTo ?? formListKey(lists, currentStatus);

  const showDuplicateKey = (message = DUPLICATE_PRODUCT_ID_MESSAGE, focus = false) =>
    form.setError('productId', { type: DUPLICATE_ERROR_TYPE, message }, { shouldFocus: focus });

  const productId = form.watch('productId');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (takenKeys.has(productId.trim())) {
        showDuplicateKey();
      } else if (form.getFieldState('productId').error?.type === DUPLICATE_ERROR_TYPE) {
        form.clearErrors('productId');
      }
    }, ISSUE_KEY_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [productId, takenKeys]);

  // Duplicate issue key (409) is shown under the field instead of as a toast
  const showError = (error: unknown, fallback: string, key: string) => {
    if (isConflictError(error)) {
      // Added by someone else after the form opened
      setTakenKeys((prev) => new Set(prev).add(key));
      showDuplicateKey(apiErrorMessage(error, DUPLICATE_PRODUCT_ID_MESSAGE), true);
      return;
    }
    toast.error(apiErrorMessage(error, fallback));
  };

  // The backend sets the date (today) when the card is created
  const onSubmit = async (fields: CardFormValues) => {
    if (!boardId) return;
    if (takenKeys.has(fields.productId)) {
      showDuplicateKey(DUPLICATE_PRODUCT_ID_MESSAGE, true);
      return;
    }
    if (isEdit && card?._id) {
      try {
        const res = await updateCard(boardId, card._id, fields);
        let saved = res.data;
        if (movedTo && movedTo !== card.status) {
          try {
            saved = (await updateCardStatus(boardId, card._id, movedTo)).data;
          } catch (error) {
            // The changes are saved, only the move failed
            reportError('Move error', error, 'Card saved, but it could not be moved.');
            onSaved?.(saved);
            return;
          }
        }
        onSaved?.(saved);
        toast.success('Card updated.');
      } catch (error) {
        logError('Update error', error);
        showError(error, 'Failed to save card.', fields.productId);
      }
      return;
    }

    try {
      // Author is taken from the access token by the backend
      const res = await submitCard(boardId, { ...fields, status: movedTo ?? status });

      if (onCreated) {
        onCreated();
        return;
      }

      // The toaster is in the layout, so it stays visible after the navigation
      toast.success(res.data.message || 'Card submitted!');
      form.reset(EMPTY_CARD_FORM);
      router.push(ROUTES.home);

    } catch (error) {
      logError('Submission error', error);
      showError(error, 'Failed to submit card.', fields.productId);
    }
  };

  return (
    <Form {...form}>
      <form
        className="mx-auto my-6 w-full max-w-[640px] overflow-hidden rounded-xl bg-white font-jira text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] max-[480px]:my-3"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {/* The same gradient as the board */}
        <header className={`${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`}>
          <h2 className="text-xl font-semibold text-white" id="card-form-title">
            {isEdit ? 'Edit card' : 'Create card'}
          </h2>
        </header>

        <div className={`${SECTION_PADDING} flex flex-col pt-4 pb-4`}>
          <p className="text-xs text-jira-secondary">
            Required fields are marked with an asterisk {required}
          </p>

          {/* Issue type and the list side by side; stacked on narrow screens */}
          <div className="flex flex-wrap gap-x-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className={`${FORM_ITEM_CLASS} min-w-[180px] flex-1`}>
                  <FormLabel className={LABEL_CLASS}>Issue type {required}</FormLabel>
                  <FormControl>
                    <IssueTypeSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage className={FIELD_ERROR_CLASS} />
                </FormItem>
              )}
            />

            <div className={`${FORM_ITEM_CLASS} min-w-[180px] flex-1`}>
              <label htmlFor="card-list" className={LABEL_CLASS}>
                List
              </label>
              <ListSelect
                id="card-list"
                lists={lists}
                value={selectedList}
                onChange={setMovedTo}
                placeholder={currentStatus === BACKLOG_STATUS ? 'Backlog' : 'Loading lists…'}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Summary {required}</FormLabel>
                <SummaryEditor field={field} placeholder="What needs to be done?" />
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Issue key {required}</FormLabel>
                <FormControl>
                  <Input className="bg-white text-jira-text" placeholder="e.g. MA-100" maxLength={PRODUCT_ID_MAX_LENGTH} {...field} />
                </FormControl>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Time tracking {required}</FormLabel>
                <FormControl>
                  <div className="flex gap-2" role="group" aria-label="Time tracking">
                    {PRIORITIES.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        className={`min-w-9 rounded-full font-semibold ${
                          p === field.value
                            ? 'bg-board-via text-white hover:bg-board-via'
                            : 'bg-jira-neutral text-jira-text hover:bg-jira-neutral-hover'
                        }`}
                        aria-pressed={p === field.value}
                        onClick={() => field.onChange(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />
        </div>

        <footer className={`${SECTION_PADDING} flex items-center justify-end gap-2 pt-4 pb-6`}>
          {/* Set by the server when the card is created and never changed, so it is only shown */}
          {isEdit && card?.submittedAt && (
            <span className="mr-auto text-xs text-jira-secondary">
              Created <time dateTime={card.submittedAt}>{formatDate(card.submittedAt)}</time>
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-jira-secondary"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            Cancel
          </Button>
          {/* The same blue as the header's gradient */}
          <Button
            type="submit"
            size="sm"
            className="bg-board-via px-4 hover:bg-board-from"
            disabled={form.formState.isSubmitting}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </footer>
      </form>
    </Form>
  );
}
