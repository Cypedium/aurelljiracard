'use client';
import { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/16/solid';
import IssueTypeIcon from './IssueTypeIcon';
import NewIssueTypeDialog from './NewIssueTypeDialog';
import { useIssueTypes } from '../cards/useIssueTypes';
import { MAX_ISSUE_TYPES, type CardType } from '../utils/cardType';
import { isAdmin } from '../utils/session';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';

// Övriga props (id, aria-*, ref från FormControl) går till knappen
type Props = Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  value: CardType;
  onChange: (type: CardType) => void;
};

// Valet som öppnar dialogen för en ny typ; aldrig en typnyckel (de har bara a–z, 0–9 och bindestreck)
const NEW_TYPE_VALUE = '__new__';

// Jira-liknande dropdown med ikon per typ; Radix sköter tangentbord, fokus och Escape.
// Admin: sist finns "New issue type", som lägger till en typ för alla och väljer den
export default function IssueTypeSelect({ value, onChange, className, ...triggerProps }: Props) {
  const types = useIssueTypes();
  const [admin, setAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => setAdmin(isAdmin()), []);

  return (
    <>
      <Select value={value} onValueChange={(v) => (v === NEW_TYPE_VALUE ? setCreating(true) : onChange(v))}>
        <SelectTrigger {...triggerProps} className={cn('w-full max-w-[240px] font-medium text-jira-text', className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="font-jira text-jira-text">
          {types.map((t) => (
            <SelectItem key={t.key} value={t.key}>
              <IssueTypeIcon type={t.key} />
              <span className="truncate">{t.label}</span>
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
                {types.length >= MAX_ISSUE_TYPES ? `Max ${MAX_ISSUE_TYPES} issue types` : 'New issue type'}
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
