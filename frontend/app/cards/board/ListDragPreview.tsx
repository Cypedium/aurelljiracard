import type { CSSProperties, Ref } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { Card } from "../../api/endpoints";
import { HEADER_HEIGHT, ROW_HEIGHT, type BoardHeader } from "../../utils/boardLayout";
import { listColor } from "../../utils/styles";
import CardFace from "./CardFace";
import { useLanguage } from "../../hooks/useLanguage";
import { listTitle } from "../../utils/boardLayout";

type Props = {
  ref: Ref<HTMLDivElement>;
  header: BoardHeader;
  count: number;
  // The list's cards in order from the top
  cards: Card[];
  // Width and position from useListDrag
  style: CSSProperties;
};

// The lifted list follows the mouse, tilted (useListDrag moves it)
export default function ListDragPreview({ ref, header, count, cards, style }: Props) {
  const { t } = useLanguage();
  const color = listColor(header);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed top-0 left-0 z-[999] flex flex-col gap-[10px] overflow-hidden rounded-xl px-2 pb-2 shadow-[0_12px_28px_rgba(9,30,66,0.35)] ${color.className}`}
      style={{ ...style, maxHeight: "80vh", ...color.style }}
    >
      <div className="flex items-center gap-2 pr-1" style={{ height: HEADER_HEIGHT }}>
        <span className="min-w-0 flex-1 truncate px-3 py-1 text-sm font-semibold">{listTitle(header, t)}</span>
        <span className="text-sm opacity-80">{count}</span>
      </div>
      {/* The same order as the list: header, "Add a card", the cards */}
      <div className="flex h-8 w-fit shrink-0 items-center gap-2 px-2 text-sm font-medium">
        {/* The same icon as "Create card" in the navbar */}
        <PencilSquareIcon className="size-4" aria-hidden />
        {t("Add a card")}
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
