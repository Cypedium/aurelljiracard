'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/16/solid';
import IssueTypeIcon from './IssueTypeIcon';
import { CARD_TYPES, cardTypeLabel, type CardType } from '../utils/cardType';
import { FIELD_CLASS, FIELD_FOCUS_CLASS } from '../utils/styles';

type Props = {
  id: string;
  value: CardType;
  onChange: (type: CardType) => void;
};

// Jira-liknande dropdown med ikon per typ (en native <select> kan inte visa ikoner)
export default function IssueTypeSelect({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;

  const openList = () => {
    setActive(Math.max(0, CARD_TYPES.findIndex((t) => t.key === value)));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (type: CardType) => {
    onChange(type);
    close();
  };

  // Fokus till listan när den öppnas, så att piltangenterna fungerar
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Klick utanför stänger listan
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const last = CARD_TYPES.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        setActive(0);
        break;
      case 'End':
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        choose(CARD_TYPES[active].key);
        break;
      case 'Escape':
        // Stäng bara listan, inte redigeringsdialogen runt formuläret
        e.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-[240px]">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`${FIELD_CLASS} ${FIELD_FOCUS_CLASS} flex h-9 items-center gap-2 px-2 text-left font-medium ${
          open ? 'border-jira-focus bg-white shadow-[inset_0_0_0_1px_var(--color-jira-focus)]' : ''
        }`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
      >
        <IssueTypeIcon type={value} />
        <span className="flex-1">{cardTypeLabel(value)}</span>
        <ChevronDownIcon
          className={`size-4 text-jira-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={id}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKeyDown}
          className="absolute z-10 mt-1 w-full rounded-lg bg-white py-1 shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] outline-none"
        >
          {CARD_TYPES.map((t, i) => {
            const selected = t.key === value;
            return (
              <li
                key={t.key}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${
                  selected
                    ? 'bg-jira-info text-jira-primary shadow-[inset_2px_0_0_var(--color-jira-primary)]'
                    : i === active
                      ? 'bg-jira-hover'
                      : ''
                } ${i === active ? 'outline-2 -outline-offset-2 outline-jira-focus' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(t.key)}
              >
                <IssueTypeIcon type={t.key} />
                <span className="flex-1">{t.label}</span>
                {selected && <CheckIcon className="size-4" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
