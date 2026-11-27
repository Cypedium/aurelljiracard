import { useCallback, useEffect } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { DUPLICATE_CHECK_DELAY_MS, DUPLICATE_ERROR_TYPE, duplicateAction } from '../utils/duplicateCheck';

// Shows `message` under the field while typing when isTaken(value) is true, and clears it when the value is free.
// isTaken must be stable between renders (useCallback), or the check runs on every render.
// Returns showDuplicate for the submit and for the server's 409
export function useDuplicateCheck<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>,
  isTaken: (value: string) => boolean,
  message: string,
) {
  const showDuplicate = useCallback(
    (text = message, focus = false) => form.setError(name, { type: DUPLICATE_ERROR_TYPE, message: text }, { shouldFocus: focus }),
    [form, name, message],
  );

  const value = String(form.watch(name) ?? '');
  useEffect(() => {
    const timer = setTimeout(() => {
      const action = duplicateAction(isTaken(value), form.getFieldState(name).error?.type);
      if (action === 'show') showDuplicate();
      if (action === 'clear') form.clearErrors(name);
    }, DUPLICATE_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, isTaken, form, name, showDuplicate]);

  return showDuplicate;
}
