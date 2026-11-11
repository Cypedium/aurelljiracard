'use client';
import { selectBoard, useBoards } from '../cards/useBoards';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';

// Navbaren: vilken board som visas. Den egna först, sedan de man är medarbetare på (backend sorterar)
export default function BoardSwitcher({ onSelected }: { onSelected?: () => void }) {
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
        className="h-8 max-w-[220px] border-white/30 bg-white/10 font-jira text-sm text-white hover:bg-white/20 data-[placeholder]:text-white [&_svg]:text-white!"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="font-jira text-jira-text">
        {own.map((b) => (
          <SelectItem key={b._id} value={b._id}>
            <span className="truncate">{b.name}</span>
          </SelectItem>
        ))}
        {shared.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-xs text-jira-secondary">Shared with you</SelectLabel>
              {shared.map((b) => (
                <SelectItem key={b._id} value={b._id}>
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
