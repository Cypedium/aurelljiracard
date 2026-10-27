'use client';
import IssueTypeIcon from './IssueTypeIcon';
import { CARD_TYPES, type CardType } from '../utils/cardType';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Övriga props (id, aria-*, ref från FormControl) går till knappen
type Props = Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  value: CardType;
  onChange: (type: CardType) => void;
};

// Jira-liknande dropdown med ikon per typ; Radix sköter tangentbord, fokus och Escape
export default function IssueTypeSelect({ value, onChange, className, ...triggerProps }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CardType)}>
      <SelectTrigger {...triggerProps} className={cn('w-full max-w-[240px] font-medium text-jira-text', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="font-jira text-jira-text">
        {CARD_TYPES.map((t) => (
          <SelectItem key={t.key} value={t.key}>
            <IssueTypeIcon type={t.key} />
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
