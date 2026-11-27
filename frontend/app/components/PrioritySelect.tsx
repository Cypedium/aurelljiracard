'use client';
import { PRIORITIES } from '../utils/cardForm';
import { Button } from './ui/button';

type Props = {
  value: number;
  onChange: (value: number) => void;
  // For screen readers: the buttons form one group
  label: string;
};

// The card's priority (1-5) as round buttons; the picked one is blue
export default function PrioritySelect({ value, onChange, label }: Props) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {PRIORITIES.map((p) => (
        <Button
          key={p}
          type="button"
          size="sm"
          className={`min-w-9 rounded-full font-semibold ${
            p === value ? 'bg-board-via text-white hover:bg-board-via' : 'bg-jira-neutral text-jira-text hover:bg-jira-neutral-hover'
          }`}
          aria-pressed={p === value}
          onClick={() => onChange(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  );
}
