'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Card as CardData } from '../../api/endpoints';
import { useBoards } from '../../hooks/useBoards';
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck';
import {
  DUPLICATE_PRODUCT_ID_MESSAGE,
  EMPTY_CARD_FORM,
  PRODUCT_ID_MAX_LENGTH,
  cardFormSchema,
  cardToFormValues,
  formListKey,
  type CardFormValues,
} from '../../utils/cardForm';
import { formatDate } from '../../utils/date';
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS } from '../../utils/styles';
import JiraFormCard, { FormActions } from '../../components/JiraFormCard';
import { BACKLOG_STATUS, type AnyCardStatus } from '../../utils/backlog';
import type { CardStatus } from '../../utils/boardLayout';
import IssueTypeSelect from '../../components/IssueTypeSelect';
import ListSelect from '../../components/ListSelect';
import PrioritySelect from '../../components/PrioritySelect';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import SummaryEditor from '../../components/SummaryEditor';
import { useLanguage } from '../../hooks/useLanguage';
import { useCardFormData } from './useCardFormData';
import { useCardSubmit } from './useCardSubmit';

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
  const { t } = useLanguage();
  const router = useRouter();
  // The form is only shown on a board page, once the board has loaded
  const boardId = useBoards().current?._id ?? null;
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: card ? cardToFormValues(card) : EMPTY_CARD_FORM,
  });

  const { takenKeys, addTakenKey, lists } = useCardFormData(boardId, card?._id);
  // null = not changed: the card stays where it is (new card: the list it is created in)
  const [movedTo, setMovedTo] = useState<CardStatus | null>(null);
  const currentStatus = card ? card.status : status;
  const selectedList = movedTo ?? formListKey(lists, currentStatus);

  const isTakenKey = useCallback((key: string) => takenKeys.has(key.trim()), [takenKeys]);
  const showDuplicateKey = useDuplicateCheck(form, 'productId', isTakenKey, DUPLICATE_PRODUCT_ID_MESSAGE);

  const onSubmit = useCardSubmit({
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
  });

  return (
    <Form {...form}>
      <JiraFormCard
        title={isEdit ? t('Edit card') : t('Create card')}
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto my-6 max-w-[640px] max-[480px]:my-3"
        bodyClassName="pt-4"
        footer={
          <FormActions
            className="pt-4"
            submitLabel={isEdit ? t('Save') : t('Create')}
            submitting={form.formState.isSubmitting}
            onCancel={() => (onCancel ? onCancel() : router.back())}
            start={
              // Set by the server when the card is created and never changed, so it is only shown
              isEdit &&
              card?.submittedAt && (
                <span className="mr-auto text-xs text-jira-secondary">
                  {t('Created')} <time dateTime={card.submittedAt}>{formatDate(card.submittedAt)}</time>
                </span>
              )
            }
          />
        }
      >
        <p className="text-xs text-jira-secondary">
          {t('Required fields are marked with an asterisk')} {required}
        </p>

        {/* Issue type and the list side by side; stacked on narrow screens */}
        <div className="flex flex-wrap gap-x-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className={`${FORM_ITEM_CLASS} min-w-[180px] flex-1`}>
                <FormLabel className={LABEL_CLASS}>{t('Issue type')} {required}</FormLabel>
                <FormControl>
                  <IssueTypeSelect value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <div className={`${FORM_ITEM_CLASS} min-w-[180px] flex-1`}>
            <label htmlFor="card-list" className={LABEL_CLASS}>
              {t('List')}
            </label>
            <ListSelect
              id="card-list"
              lists={lists}
              value={selectedList}
              onChange={setMovedTo}
              placeholder={currentStatus === BACKLOG_STATUS ? t('Backlog') : t('Loading lists…')}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t('Summary')} {required}</FormLabel>
              <SummaryEditor field={field} placeholder={t('What needs to be done?')} />
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem className={FORM_ITEM_CLASS}>
              <FormLabel className={LABEL_CLASS}>{t('Issue key')} {required}</FormLabel>
              <FormControl>
                <Input className="bg-white text-jira-text" placeholder={t('e.g. MA-100')} maxLength={PRODUCT_ID_MAX_LENGTH} {...field} />
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
              <FormLabel className={LABEL_CLASS}>{t('Time tracking')} {required}</FormLabel>
              <FormControl>
                <PrioritySelect value={field.value} onChange={field.onChange} label={t('Time tracking')} />
              </FormControl>
              <FormMessage className={FIELD_ERROR_CLASS} />
            </FormItem>
          )}
        />
      </JiraFormCard>
    </Form>
  );
}
