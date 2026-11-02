'use client';
import { CARD_DESTINATIONS, type AnyCardStatus } from '../utils/backlog';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Övriga props (id, aria-*, ref från FormControl) går till knappen
type Props = Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  value: AnyCardStatus;
  onChange: (status: AnyCardStatus) => void;
};

// Var ett nytt kort hamnar: en kolumn på boarden eller backloggen (utan assignee)
export default function CardDestinationSelect({ value, onChange, className, ...triggerProps }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AnyCardStatus)}>
      <SelectTrigger {...triggerProps} className={cn('w-full max-w-[240px] font-medium text-jira-text', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="font-jira text-jira-text">
        {CARD_DESTINATIONS.map((d) => (
          <SelectItem key={d.key} value={d.key}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
