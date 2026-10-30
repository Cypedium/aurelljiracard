'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitCard, updateCard, type Card as CardData } from '..//../api/endpoints';
import { toast } from 'sonner';
import { EMPTY_CARD_FORM, PRIORITIES, cardFormSchema, cardToFormValues, type CardFormValues } from '../../utils/cardForm';
import { apiErrorMessage, isConflictError } from '../../utils/apiError';
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, SECTION_PADDING } from '../../utils/styles';
import type { CardStatus } from '../../utils/boardLayout';
import IssueTypeSelect from '../../components/IssueTypeSelect';
import { Button } from '../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

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

const required = <span className="text-jira-danger">*</span>;

export default function Card({ card, onSaved, onCancel, status, onCreated }: CardProps = {}) {
  const isEdit = Boolean(card?._id);
  const router = useRouter();
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: card ? cardToFormValues(card) : EMPTY_CARD_FORM,
  });

  // Duplicate issue key (409) is shown under the field instead of as a toast
  const showError = (error: unknown, fallback: string) => {
    if (isConflictError(error)) {
      form.setError('productId', { message: apiErrorMessage(error, 'Issue key already exists.') }, { shouldFocus: true });
      return;
    }
    toast.error(apiErrorMessage(error, fallback));
  };

  // The backend sets the date (today) when the card is created
  const onSubmit = async (fields: CardFormValues) => {
    if (isEdit && card?._id) {
      try {
        const res = await updateCard(card._id, fields);
        onSaved?.(res.data);
      } catch (error) {
        console.error('Update error:', (error as Error).message);
        showError(error, 'Failed to save card.');
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

      // Toastern ligger i layouten, så den syns kvar efter navigeringen
      toast.success(res.data.message || 'Card submitted!');
      form.reset(EMPTY_CARD_FORM);
      router.push("/");

    } catch (error) {
      console.error('Submission error:', (error as Error).message);
      showError(error, 'Failed to submit card.');
    }
  };

  return (
    <Form {...form}>
      <form
        className="mx-auto my-6 w-full max-w-[640px] overflow-hidden rounded-xl bg-white font-jira text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] max-[480px]:my-3"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        {/* Samma gradient som boarden */}
        <header className={`${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`}>
          <h2 className="text-xl font-semibold text-white" id="card-form-title">
            {isEdit ? 'Edit card' : 'Create card'}
          </h2>
        </header>

        <div className={`${SECTION_PADDING} flex flex-col pt-4 pb-4`}>
          <p className="text-xs text-jira-secondary">
            Required fields are marked with an asterisk {required}
          </p>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Issue type {required}</FormLabel>
                <FormControl>
                  <IssueTypeSelect value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Summary {required}</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[88px] resize-y bg-white text-jira-text"
                    placeholder="What needs to be done?"
                    {...field}
                  />
                </FormControl>
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
                  <Input className="bg-white text-jira-text" placeholder="e.g. AGB-12" {...field} />
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

        <footer className={`${SECTION_PADDING} flex justify-end gap-2 pt-4 pb-6`}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-jira-secondary"
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            Cancel
          </Button>
          {/* Samma blå som headerns gradient */}
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
