import { EyeIcon } from "@heroicons/react/16/solid";
import { COLLAPSED_LIST_MAX_HEIGHT, HIDDEN_LIST_ATTR, LIST_KEY_ATTR, type BoardHeader } from "../../utils/boardLayout";
import { listColor } from "../../utils/styles";

type Props = {
  header: BoardHeader;
  // null medan boarden laddar
  count: number | null;
  // Ett draget kort är över remsan
  dropTarget: boolean;
  onShow: () => void;
};

// En dold lista: smal remsa med rubriken på höjden. Klick visar listan igen
export default function CollapsedListStrip({ header, count, dropTarget, onShow }: Props) {
  const color = listColor(header);

  return (
    <button
      type="button"
      aria-label={`Show ${header.title}`}
      aria-expanded={false}
      title="Show list"
      {...{ [HIDDEN_LIST_ATTR]: header.key, [LIST_KEY_ATTR]: header.key }}
      className={`pointer-events-auto flex min-w-0 flex-col items-center gap-3 overflow-hidden rounded-xl px-1 py-3 shadow-[0_1px_1px_rgba(9,30,66,0.25)] hover:brightness-95 ${
        dropTarget ? "ring-2 ring-white brightness-95" : ""
      } ${color.className}`}
      style={{ maxHeight: COLLAPSED_LIST_MAX_HEIGHT, ...color.style }}
      onClick={onShow}
    >
      <EyeIcon className="size-4 shrink-0 opacity-80" aria-hidden />
      {/* Rubriken läses uppifrån och ner, som i Trello */}
      <span className="min-h-0 truncate text-sm font-semibold [writing-mode:vertical-rl]">{header.title}</span>
      <span className="shrink-0 text-sm opacity-80">{count}</span>
    </button>
  );
}
