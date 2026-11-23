'use client';
import { defaultListColor, type BoardHeader, type CardStatus } from '../utils/boardLayout';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useLanguage } from '../hooks/useLanguage';
import { listTitle } from '../utils/boardLayout';

// Other props (id, aria-*, ref from FormControl) go to the button
type Props = Omit<React.ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  lists: BoardHeader[];
  // undefined = not on the board (the backlog); shows the placeholder
  value?: CardStatus;
  onChange: (key: CardStatus) => void;
  placeholder?: string;
};

// The board's lists with the list's colour as a dot; the same look as IssueTypeSelect
export default function ListSelect({ lists, value, onChange, placeholder, className, ...triggerProps }: Props) {
  const { t } = useLanguage();
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={!lists.length}>
      <SelectTrigger {...triggerProps} className={cn('w-full max-w-[240px] font-medium text-jira-text', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="font-jira text-jira-text">
        {lists.map((list) => (
          <SelectItem key={list.key} value={list.key}>
            <span
              className="size-3 shrink-0 rounded-full ring-1 ring-black/15"
              style={{ background: list.color ?? defaultListColor(list.key) }}
              aria-hidden
            />
            <span className="truncate">{listTitle(list, t)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
