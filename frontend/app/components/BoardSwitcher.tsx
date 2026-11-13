'use client';
import { selectBoard, useBoards } from '../cards/useBoards';
import { cn } from '../lib/utils';
import { NAV_MENU_CLASS, NAV_MENU_ITEM_CLASS, NAV_MENU_LABEL_CLASS, NAV_MENU_SEPARATOR_CLASS } from '../utils/styles';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';

// Navbaren: vilken board som visas. Texten ärver radens färg (navbarens textfärg, vit i mobilmenyn); den öppna listan har navbarens tema. Den egna först, sedan de man är medarbetare på (backend sorterar)
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
          'h-8 max-w-[220px] border-white/30 bg-white/10 font-jira text-sm text-inherit hover:bg-white/20 [&_svg]:text-current!',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className={NAV_MENU_CLASS}>
        {own.map((b) => (
          <SelectItem key={b._id} value={b._id} className={NAV_MENU_ITEM_CLASS}>
            <span className="truncate">{b.name}</span>
          </SelectItem>
        ))}
        {shared.length > 0 && (
          <>
            <SelectSeparator className={NAV_MENU_SEPARATOR_CLASS} />
            <SelectGroup>
              <SelectLabel className={NAV_MENU_LABEL_CLASS}>Shared with you</SelectLabel>
              {shared.map((b) => (
                <SelectItem key={b._id} value={b._id} className={NAV_MENU_ITEM_CLASS}>
                  <span className="truncate">{b.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
