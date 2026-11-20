'use client';
import { useState } from 'react';
import { CheckIcon, PaintBrushIcon } from '@heroicons/react/16/solid';
import { LIST_SWATCHES } from '../utils/boardLayout';
import { readableTextColor } from '../utils/color';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type Props = {
  // The column's name, for screen readers
  title: string;
  // The user's own colour; missing = the default colour
  color?: string;
  defaultColor: string;
  // null = restore the default colour
  onChange: (color: string | null) => void;
};

// The brush in the list's corner: preset colours, a custom colour (the browser's colour picker) and reset
export default function ColumnColorPicker({ title, color, defaultColor, onChange }: Props) {
  const current = color ?? defaultColor;
  const [open, setOpen] = useState(false);

  // A preset colour or reset: save and close
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
          <PaintBrushIcon className="size-4" aria-hidden />
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
            {/* Doesn't close here: the colour picker sends changes while you drag */}
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
