'use client';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { selectBoard, useBoards } from '../hooks/useBoards';
import { cn } from '../lib/utils';
import { boardLabel } from '../utils/currentBoard';
import { NAV_ICON_CLASS, NAV_MENU_CLASS, NAV_MENU_ITEM_CLASS, NAV_MENU_LABEL_CLASS, NAV_MENU_SEPARATOR_CLASS } from '../utils/styles';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';

// The navbar: which board is shown, with the clipboard icon (the Board link has the columns icon). The text inherits the row's colour, font and size like the links (the navbar's text colour, also in the mobile menu); the open list has the navbar's theme. Your own board first, then the ones you collaborate on (the backend sorts them). Switching stays on the page; Board, Backlog and Issue types reload for the selected board
export default function BoardSwitcher({ onSelected, className }: { onSelected?: () => void; className?: string }) {
  const { boards, current } = useBoards();
  if (!current) return null;

  const own = boards.filter((b) => b.role === 'admin');
  const shared = boards.filter((b) => b.role !== 'admin');

  return (
    <Select
      value={current._id}
      onValueChange={(id) => {
        selectBoard(id);
        onSelected?.();
      }}
    >
      <SelectTrigger
        aria-label="Board"
        className={cn(
          'h-auto max-w-[260px] border-0 bg-transparent py-1 shadow-none [font:inherit]! text-inherit hover:bg-white/10 focus-visible:bg-white/10 dark:bg-transparent dark:hover:bg-white/10 [&_svg]:text-current!',
          className,
        )}
      >
        <ClipboardDocumentListIcon className={NAV_ICON_CLASS} aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className={NAV_MENU_CLASS}>
        {own.map((b) => (
          <SelectItem key={b._id} value={b._id} className={NAV_MENU_ITEM_CLASS}>
            <span className="truncate">{boardLabel(b)}</span>
          </SelectItem>
        ))}
        {shared.length > 0 && (
          <>
            <SelectSeparator className={NAV_MENU_SEPARATOR_CLASS} />
            <SelectGroup>
              <SelectLabel className={NAV_MENU_LABEL_CLASS}>Shared with you</SelectLabel>
              {shared.map((b) => (
                <SelectItem key={b._id} value={b._id} className={NAV_MENU_ITEM_CLASS}>
                  <span className="truncate">{boardLabel(b)}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
