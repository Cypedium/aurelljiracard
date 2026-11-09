'use client';
import { useEffect, useState } from 'react';
import type { Card } from '../../api/endpoints';
import { defaultListColor, listDeleteBlocker, type BoardHeader, type CardStatus } from '../../utils/boardLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

type Props = {
  open: boolean;
  lists: BoardHeader[];
  cards: Card[];
  onClose: () => void;
  onConfirm: (key: CardStatus) => void;
};

// Admin: välj en tom lista att ta bort ("Delete column" i navbaren). Listor med kort och standardlistan
// visas men går inte att välja, med anledningen bredvid
export default function DeleteListDialog({ open, lists, cards, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<CardStatus | null>(null);

  // Första listan som går att ta bort, varje gång dialogen öppnas
  useEffect(() => {
    if (open) setSelected(lists.find((l) => !listDeleteBlocker(l.key, cards))?.key ?? null);
    // Bara när dialogen öppnas: ändras korten under tiden ska valet inte hoppa
  }, [open]);

  const selectedTitle = lists.find((l) => l.key === selected)?.title;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="font-jira text-jira-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete column</AlertDialogTitle>
          <AlertDialogDescription>
            The list is removed from the board for everyone. Only empty lists can be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Select value={selected ?? ''} onValueChange={setSelected}>
          <SelectTrigger aria-label="List to delete" className="w-full font-medium text-jira-text">
            <SelectValue placeholder="No empty lists" />
          </SelectTrigger>
          <SelectContent position="popper" className="font-jira text-jira-text">
            {lists.map((list) => {
              const blocker = listDeleteBlocker(list.key, cards);
              return (
                <SelectItem key={list.key} value={list.key} disabled={Boolean(blocker)}>
                  <span
                    className="size-3 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{ background: list.color ?? defaultListColor(list.key) }}
                    aria-hidden
                  />
                  <span className="truncate">{list.title}</span>
                  {blocker && <span className="ml-auto pl-3 text-xs text-jira-secondary">{blocker}</span>}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!selected}
            onClick={(e) => {
              // Stängs efter svaret från servern (useColumnActions), så att ett fel syns med dialogen öppen
              e.preventDefault();
              if (selected) onConfirm(selected);
            }}
          >
            {selectedTitle ? `Delete ${selectedTitle}` : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
