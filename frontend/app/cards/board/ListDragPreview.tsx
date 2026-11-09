import type { CSSProperties, Ref } from "react";
import { PlusIcon } from "@heroicons/react/16/solid";
import type { Card } from "../../api/endpoints";
import { HEADER_HEIGHT, ROW_HEIGHT, type BoardHeader } from "../../utils/boardLayout";
import { listColor } from "../../utils/styles";
import CardFace from "./CardFace";

type Props = {
  ref: Ref<HTMLDivElement>;
  header: BoardHeader;
  count: number;
  // Listans kort i ordning uppifrån
  cards: Card[];
  // Bredd och position från useListDrag
  style: CSSProperties;
};

// Den lyfta listan följer musen, lutad (useListDrag flyttar den)
export default function ListDragPreview({ ref, header, count, cards, style }: Props) {
  const color = listColor(header);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-[999] flex flex-col gap-[10px] overflow-hidden rounded-xl px-2 pb-2 shadow-[0_12px_28px_rgba(9,30,66,0.35)] ${color.className}`}
      style={{ ...style, maxHeight: "80vh", ...color.style }}
    >
      <div className="flex items-center gap-2 pr-1" style={{ height: HEADER_HEIGHT }}>
        <span className="min-w-0 flex-1 truncate px-3 py-1 text-sm font-semibold">{header.title}</span>
        <span className="text-sm opacity-80">{count}</span>
      </div>
      {/* Samma ordning som listan: rubrik, "Add a card", korten */}
      <div className="flex h-8 w-fit shrink-0 items-center gap-2 px-2 text-sm font-medium">
        <PlusIcon className="size-4" aria-hidden />
        Add a card
      </div>
      {cards.map((card) => (
        <CardFace
          key={card._id || card.username + card.submittedAt}
          card={card}
          className="shrink-0"
          style={{ height: ROW_HEIGHT }}
        />
      ))}
    </div>
  );
}
