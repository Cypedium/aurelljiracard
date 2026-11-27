'use client';
import { useEffect, useState } from 'react';
import type { Card } from '../../api/endpoints';
import { defaultListColor, listDeleteBlocker, type BoardHeader, type CardStatus } from '../../utils/boardLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useLanguage } from '../../hooks/useLanguage';
import { listTitle } from '../../utils/boardLayout';

type Props = {
  open: boolean;
  lists: BoardHeader[];
  cards: Card[];
  onClose: () => void;
  onConfirm: (key: CardStatus) => void;
};

// Admin: pick an empty list to delete ("Delete column" in the navbar). Lists with cards and the default list
// are shown but can't be picked, with the reason next to them
export default function DeleteListDialog({ open, lists, cards, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<CardStatus | null>(null);
  const { t } = useLanguage();

  // The first list that can be deleted, every time the dialog opens
  useEffect(() => {
    if (open) setSelected(lists.find((l) => !listDeleteBlocker(l.key, cards))?.key ?? null);
    // Only when the dialog opens: if the cards change meanwhile the choice must not jump
  }, [open]);

  const selectedList = lists.find((l) => l.key === selected);
  const selectedTitle = selectedList ? listTitle(selectedList, t) : undefined;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={t('Delete column')}
      description={t('The list is removed from the board for everyone. Only empty lists can be deleted.')}
      confirmLabel={selectedTitle ? t('Delete {title}', { title: selectedTitle }) : t('Delete')}
      confirmDisabled={!selected}
      // Closed after the server's response (useColumnActions), so an error shows with the dialog open
      closeOnConfirm={false}
      onConfirm={() => selected && onConfirm(selected)}
    >
      <Select value={selected ?? ''} onValueChange={setSelected}>
        <SelectTrigger aria-label={t('List to delete')} className="w-full font-medium text-jira-text">
          <SelectValue placeholder={t('No empty lists')} />
        </SelectTrigger>
        <SelectContent position="popper" className="font-jira text-jira-text">
          {lists.map((list) => {
            const blocker = listDeleteBlocker(list.key, cards, t);
            return (
              <SelectItem key={list.key} value={list.key} disabled={Boolean(blocker)}>
                <span
                  className="size-3 shrink-0 rounded-full ring-1 ring-black/15"
                  style={{ background: list.color ?? defaultListColor(list.key) }}
                  aria-hidden
                />
                <span className="truncate">{listTitle(list, t)}</span>
                {blocker && <span className="ml-auto pl-3 text-xs text-jira-secondary">{blocker}</span>}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </ConfirmDialog>
  );
}
