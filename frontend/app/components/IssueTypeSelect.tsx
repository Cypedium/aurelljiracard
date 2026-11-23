'use client';
import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/16/solid';
import IssueTypeIcon from './IssueTypeIcon';
import NewIssueTypeDialog from './NewIssueTypeDialog';
import { useIssueTypes } from '../hooks/useIssueTypes';
import { useBoards } from '../hooks/useBoards';
import { useFeatures } from '../hooks/useFeatures';
import { MAX_ISSUE_TYPES, type CardType } from '../utils/cardType';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';
import { useLanguage } from '../hooks/useLanguage';
import { issueTypeLabel } from '../utils/cardType';

// Other props (id, aria-*, ref from FormControl) go to the button
type Props = Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  value: CardType;
  onChange: (type: CardType) => void;
};

// The option that opens the dialog for a new type; never a type key (those only have a–z, 0–9 and hyphens)
const NEW_TYPE_VALUE = '__new__';

// A Jira-like dropdown with an icon per type; Radix handles keyboard, focus and Escape.
// The board's admin: last there is "New issue type", which adds a type to the board and selects it
export default function IssueTypeSelect({ value, onChange, className, ...triggerProps }: Props) {
  const types = useIssueTypes();
  // "New issue type": the board's admin, when manageIssueTypes is on
  const { boardAdmin } = useBoards();
  const { isOn } = useFeatures();
  const admin = boardAdmin && isOn('manageIssueTypes');
  const [creating, setCreating] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <Select value={value} onValueChange={(v) => (v === NEW_TYPE_VALUE ? setCreating(true) : onChange(v))}>
        <SelectTrigger {...triggerProps} className={cn('w-full max-w-[240px] font-medium text-jira-text', className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="font-jira text-jira-text">
          {types.map((type) => (
            <SelectItem key={type.key} value={type.key}>
              <IssueTypeIcon type={type.key} />
              <span className="truncate">{issueTypeLabel(type, t)}</span>
            </SelectItem>
          ))}
          {admin && (
            <>
              <SelectSeparator />
              <SelectItem
                value={NEW_TYPE_VALUE}
                disabled={types.length >= MAX_ISSUE_TYPES}
                className="text-jira-secondary"
              >
                <PlusIcon className="size-4" aria-hidden />
                {types.length >= MAX_ISSUE_TYPES ? t('Max {max} issue types', { max: MAX_ISSUE_TYPES }) : t('New issue type')}
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {admin && (
        <NewIssueTypeDialog
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={(type) => {
            setCreating(false);
            onChange(type.key);
          }}
        />
      )}
    </>
  );
}
