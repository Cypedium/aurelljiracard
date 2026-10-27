'use client';
import IssueTypeIcon from './IssueTypeIcon';
import { CARD_TYPES, type CardType } from '../utils/cardType';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Props = {
  id: string;
  value: CardType;
  onChange: (type: CardType) => void;
};

// Jira-liknande dropdown med ikon per typ; Radix sköter tangentbord, fokus och Escape
export default function IssueTypeSelect({ id, value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CardType)}>
      <SelectTrigger id={id} className="w-full max-w-[240px] font-medium text-jira-text">
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
