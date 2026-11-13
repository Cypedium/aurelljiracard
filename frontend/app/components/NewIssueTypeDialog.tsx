'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createIssueType } from '../api/endpoints';
import { useBoards } from '../cards/useBoards';
import { addIssueType, useIssueTypes } from '../cards/useIssueTypes';
import { apiErrorMessage, isConflictError, logError } from '../utils/apiError';
import { DUPLICATE_ERROR_TYPE, ISSUE_KEY_CHECK_DELAY_MS } from '../utils/cardForm';
import {
  DUPLICATE_ISSUE_TYPE_MESSAGE,
  EMPTY_ISSUE_TYPE_FORM,
  ISSUE_TYPE_ICONS,
  ISSUE_TYPE_LABEL_MAX_LENGTH,
  ISSUE_TYPE_SWATCHES,
  issueTypeFormSchema,
  isTakenIssueTypeLabel,
  type IssueType,
  type IssueTypeFormValues,
} from '../utils/cardType';
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, ISSUE_TYPE_ICON, LABEL_CLASS, SECTION_PADDING } from '../utils/styles';
import IssueTypeIcon from './IssueTypeIcon';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';

type Props = {
  open: boolean;
  onClose: () => void;
  // Den nya typen, så att formuläret som öppnade dialogen kan välja den
  onCreated: (type: IssueType) => void;
};

// Vald färg/ikon: ring runt knappen
const PICKED_CLASS = 'ring-2 ring-jira-focus ring-offset-2';

// Admin: ny ärendetyp för alla. Öppnas från "New issue type" i IssueTypeSelect
export default function NewIssueTypeDialog({ open, onClose, onCreated }: Props) {
  const form = useForm<IssueTypeFormValues>({
    resolver: zodResolver(issueTypeFormSchema),
    defaultValues: EMPTY_ISSUE_TYPE_FORM,
  });

  // Tomt formulär varje gång dialogen öppnas
  useEffect(() => {
    if (open) form.reset(EMPTY_ISSUE_TYPE_FORM);
  }, [open, form]);

  const preview = form.watch();

  // Samma kontroll som för Issue key i kortformuläret: ett namn som redan finns visas under fältet medan man skriver
  const types = useIssueTypes();
  const boardId = useBoards().current?._id ?? null;
  const showDuplicate = (message = DUPLICATE_ISSUE_TYPE_MESSAGE, focus = false) =>
    form.setError('label', { type: DUPLICATE_ERROR_TYPE, message }, { shouldFocus: focus });

  const label = preview.label;
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTakenIssueTypeLabel(types, label)) {
        showDuplicate();
      } else if (form.getFieldState('label').error?.type === DUPLICATE_ERROR_TYPE) {
        form.clearErrors('label');
      }
    }, ISSUE_KEY_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [label, types]);

  const onSubmit = async (values: IssueTypeFormValues) => {
    if (!boardId) return;
    if (isTakenIssueTypeLabel(types, values.label)) {
      showDuplicate(DUPLICATE_ISSUE_TYPE_MESSAGE, true);
      return;
    }
    try {
      const res = await createIssueType(boardId, { ...values, label: values.label.trim() });
      addIssueType(res.data);
      toast.success(`Issue type ${res.data.label} added.`);
      onCreated(res.data);
    } catch (error) {
      logError('Create issue type error', error);
      if (isConflictError(error)) {
        showDuplicate(apiErrorMessage(error, DUPLICATE_ISSUE_TYPE_MESSAGE), true);
        return;
      }
      toast.error(apiErrorMessage(error, 'Could not add issue type.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // Formuläret har egen bakgrund och skugga
        className="gap-0 border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[420px]"
      >
        <DialogTitle className="sr-only">New issue type</DialogTitle>
        <Form {...form}>
          <form
            className="w-full overflow-hidden rounded-xl bg-white text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)]"
            // Dialogen ligger i kortformuläret i React-trädet: submit får inte bubbla dit
            onSubmit={(e) => {
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            noValidate
          >
            <header className={`${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`}>
              <h2 className="text-xl font-semibold text-white">New issue type</h2>
            </header>

            <div className={`${SECTION_PADDING} flex flex-col pt-2 pb-4`}>
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className={FORM_ITEM_CLASS}>
                    <FormLabel className={LABEL_CLASS}>Name</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white text-jira-text"
                        placeholder="e.g. Story"
                        autoComplete="off"
                        maxLength={ISSUE_TYPE_LABEL_MAX_LENGTH}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className={FIELD_ERROR_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className={FORM_ITEM_CLASS}>
                    <FormLabel className={LABEL_CLASS}>Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                        {ISSUE_TYPE_SWATCHES.map((swatch) => (
                          <button
                            key={swatch.color}
                            type="button"
                            role="radio"
                            aria-checked={field.value === swatch.color}
                            aria-label={swatch.name}
                            title={swatch.name}
                            className={`size-7 rounded-md ${field.value === swatch.color ? PICKED_CLASS : ''}`}
                            style={{ background: swatch.color }}
                            onClick={() => field.onChange(swatch.color)}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className={FIELD_ERROR_CLASS} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className={FORM_ITEM_CLASS}>
                    <FormLabel className={LABEL_CLASS}>Icon</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
                        {ISSUE_TYPE_ICONS.map((icon) => {
                          const Icon = ISSUE_TYPE_ICON[icon];
                          return (
                            <button
                              key={icon}
                              type="button"
                              role="radio"
                              aria-checked={field.value === icon}
                              aria-label={icon}
                              title={icon}
                              className={`inline-flex size-7 items-center justify-center rounded-md text-white ${field.value === icon ? PICKED_CLASS : ''}`}
                              style={{ background: preview.color }}
                              onClick={() => field.onChange(icon)}
                            >
                              <Icon className="size-4" aria-hidden />
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage className={FIELD_ERROR_CLASS} />
                  </FormItem>
                )}
              />

              <p className="mt-4 flex items-center gap-2 text-xs text-jira-secondary">
                Preview:
                <IssueTypeIcon issueType={{ ...preview, label: preview.label || 'New issue type' }} />
                <span className="font-medium text-jira-text">{preview.label.trim() || 'New issue type'}</span>
              </p>
            </div>

            <footer className={`${SECTION_PADDING} flex items-center justify-end gap-2 pt-2 pb-6`}>
              <Button type="button" variant="ghost" size="sm" className="text-jira-secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-board-via px-4 hover:bg-board-from"
                disabled={form.formState.isSubmitting}
              >
                Create
              </Button>
            </footer>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
