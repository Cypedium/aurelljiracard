'use client';
import { useState } from 'react';
import { CheckIcon, PencilIcon } from '@heroicons/react/16/solid';
import { LIST_SWATCHES, readableTextColor } from '../utils/boardLayout';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type Props = {
  // Kolumnens namn, för skärmläsare
  title: string;
  // Användarens egen färg; saknas = standardfärgen
  color?: string;
  defaultColor: string;
  // null = återställ standardfärgen
  onChange: (color: string | null) => void;
};

// Pennan i listans hörn: färdiga färger, egen färg (webbläsarens färgväljare) och återställ
export default function ColumnColorPicker({ title, color, defaultColor, onChange }: Props) {
  const current = color ?? defaultColor;
  const [open, setOpen] = useState(false);

  // Färdig färg eller återställ: spara och stäng
  const choose = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change color of ${title}`}
          title="Change color"
          className="pointer-events-auto rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
        >
          <PencilIcon className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 font-jira text-jira-text">
        <p className="mb-2 text-xs font-semibold text-jira-secondary">Column color</p>
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Colors">
          {LIST_SWATCHES.map((s) => {
            const selected = s.color === current;
            return (
              <button
                key={s.color}
                type="button"
                aria-label={s.name}
                aria-pressed={selected}
                title={s.name}
                className="flex h-8 items-center justify-center rounded-md outline-none hover:ring-2 hover:ring-jira-border focus-visible:ring-2 focus-visible:ring-jira-focus"
                style={{ backgroundColor: s.color, color: readableTextColor(s.color) }}
                onClick={() => choose(s.color)}
              >
                {selected && <CheckIcon className="size-4" aria-hidden />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            {/* Stängs inte här: färgväljaren skickar ändringar medan man drar */}
            <input
              type="color"
              value={current}
              onChange={(e) => onChange(e.target.value)}
              className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Custom…
          </label>
          <Button variant="ghost" size="sm" disabled={!color} onClick={() => choose(null)}>
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
