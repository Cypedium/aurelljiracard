import { useRouter } from 'next/navigation';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { submitCard, updateCard, updateCardStatus, type Card } from '../../api/endpoints';
import { useLanguage } from '../../hooks/useLanguage';
import { apiErrorMessage, isConflictError, logError, reportError } from '../../utils/apiError';
import type { AnyCardStatus } from '../../utils/backlog';
import { DUPLICATE_PRODUCT_ID_MESSAGE, EMPTY_CARD_FORM, type CardFormValues } from '../../utils/cardForm';
import { msg } from '../../utils/i18n';
import { ROUTES } from '../../utils/routes';
import { needsMove, saveThenMove } from '../../utils/saveCard';

type Options = {
  boardId: string | null;
  form: UseFormReturn<CardFormValues>;
  // The card being edited; undefined = a new card
  card?: Card;
  // New card: the list it is created in
  status?: AnyCardStatus;
  // The list picked in the form; null = not changed
  movedTo: AnyCardStatus | null;
  isTakenKey: (key: string) => boolean;
  addTakenKey: (key: string) => void;
  showDuplicateKey: (message?: string, focus?: boolean) => void;
  onSaved?: (card: Card) => void;
  // Without it a new card redirects home
  onCreated?: () => void;
};

// The card form's submit: update (and move) an existing card, or create a new one
export function useCardSubmit({
  boardId,
  form,
  card,
  status,
  movedTo,
  isTakenKey,
  addTakenKey,
  showDuplicateKey,
  onSaved,
  onCreated,
}: Options) {
  const { t } = useLanguage();
  const router = useRouter();

  // Duplicate issue key (409) is shown under the field instead of as a toast
  const showError = (error: unknown, fallback: string, key: string) => {
    if (isConflictError(error)) {
      // Added by someone else after the form opened
      addTakenKey(key);
      showDuplicateKey(apiErrorMessage(error, DUPLICATE_PRODUCT_ID_MESSAGE), true);
      return;
    }
    toast.error(apiErrorMessage(error, fallback));
  };

  // currentStatus is missing on some older cards; any picked list is then a move
  const update = async (id: string, currentStatus: AnyCardStatus | undefined, fields: CardFormValues, board: string) => {
    const target = movedTo;
    try {
      const { card: saved, moveError } = await saveThenMove(
        async () => (await updateCard(board, id, fields)).data,
        needsMove(target, currentStatus) ? async () => (await updateCardStatus(board, id, target)).data : null,
      );
      if (moveError) {
        // The changes are saved, only the move failed
        reportError('Move error', moveError, msg('Card saved, but it could not be moved.'));
        onSaved?.(saved);
        return;
      }
      onSaved?.(saved);
      toast.success(t('Card updated.'));
    } catch (error) {
      logError('Update error', error);
      showError(error, msg('Failed to save card.'), fields.productId);
    }
  };

  const create = async (fields: CardFormValues, board: string) => {
    try {
      // The backend sets the author (from the access token) and the date
      const res = await submitCard(board, { ...fields, status: movedTo ?? status });
      if (onCreated) {
        onCreated();
        return;
      }
      // The toaster is in the layout, so it stays visible after the navigation
      toast.success(res.data.message ? t(res.data.message) : t('Card submitted!'));
      form.reset(EMPTY_CARD_FORM);
      router.push(ROUTES.home);
    } catch (error) {
      logError('Submission error', error);
      showError(error, msg('Failed to submit card.'), fields.productId);
    }
  };

  return async (fields: CardFormValues) => {
    if (!boardId) return;
    if (isTakenKey(fields.productId)) {
      showDuplicateKey(DUPLICATE_PRODUCT_ID_MESSAGE, true);
      return;
    }
    if (card?._id) await update(card._id, card.status, fields, boardId);
    else await create(fields, boardId);
  };
}
