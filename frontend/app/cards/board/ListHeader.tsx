import type { PointerEvent as ReactPointerEvent } from "react";
import { EyeSlashIcon } from "@heroicons/react/16/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ColumnColorPicker from "../../components/ColumnColorPicker";
import {
  CARDS_TOP,
  HEADER_HEIGHT,
  HEADER_TITLE_MAX_LENGTH,
  LIST_KEY_ATTR,
  NO_LIST_DRAG_ATTR,
  defaultListColor,
  type BoardHeader,
} from "../../utils/boardLayout";
import { LIST_BUTTON_HOVER_CLASS, listColor } from "../../utils/styles";

type Props = {
  header: BoardHeader;
  // null medan boarden laddar
  count: number | null;
  span: number;
  height: number;
  admin: boolean;
  renaming: boolean;
  // Listan lyfts: innehållet döljs, platshållaren ritas i bakgrundslagret
  dragging: boolean;
  onDragStart: (e: ReactPointerEvent<HTMLElement>) => void;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onRecolor: (color: string | null) => void;
  onHide: () => void;
  onAddCard: () => void;
};

// En synlig listas rubrik (admin: klicka för att byta namn, dra för att flytta) och "Add a card"
export default function ListHeader({
  header,
  count,
  span,
  height,
  admin,
  renaming,
  dragging,
  onDragStart,
  onStartRename,
  onRename,
  onRecolor,
  onHide,
  onAddCard,
}: Props) {
  const color = listColor(header);

  return (
    <div
      {...{ [LIST_KEY_ATTR]: header.key }}
      className={`flex flex-col px-2 ${dragging ? "[&>*]:invisible" : ""}`}
      style={{ gridColumn: `span ${span}`, height }}
    >
      {/* Admin: dra var som helst i rubriken och raden med "Add a card" för att flytta listan (för alla).
          Knappar har NO_LIST_DRAG_ATTR; klick på namnet byter namn, dra från det flyttar listan */}
      <div
        onPointerDown={admin && !renaming ? onDragStart : undefined}
        title={admin ? "Drag to move the list (for everyone)" : undefined}
        className={`flex shrink-0 flex-col ${admin ? "pointer-events-auto cursor-grab" : ""}`}
        style={{ height: CARDS_TOP }}
      >
        <div
          className={`flex items-center gap-2 pr-1 ${color.className}`}
          style={{ height: HEADER_HEIGHT, ...color.style }}
        >
          {renaming ? (
            <input
              autoFocus
              aria-label="Column name"
              maxLength={HEADER_TITLE_MAX_LENGTH}
              defaultValue={header.title}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => onRename(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  // Ångra: blur sparar då samma namn, dvs ingenting
                  e.currentTarget.value = header.title;
                  e.currentTarget.blur();
                }
              }}
              className="pointer-events-auto min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm font-semibold text-jira-text ring-2 ring-jira-focus outline-none"
            />
          ) : admin ? (
            <button
              type="button"
              title="Click to rename (for everyone)"
              className="pointer-events-auto min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold"
              onClick={onStartRename}
            >
              <span className="inline-block hover:bg-black/10 rounded px-1">{header.title}</span>
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate px-2 py-1 text-sm font-semibold" title={header.title}>
              {header.title}
            </span>
          )}
          <span className="text-sm opacity-80">{count}</span>
          {admin && (
            <span className="contents" {...{ [NO_LIST_DRAG_ATTR]: "" }}>
              <ColumnColorPicker
                title={header.title}
                color={header.color}
                defaultColor={defaultListColor(header.key)}
                onChange={onRecolor}
              />
            </span>
          )}
          <button
            type="button"
            aria-label={`Hide ${header.title}`}
            aria-expanded
            title="Hide list"
            {...{ [NO_LIST_DRAG_ATTR]: "" }}
            className="pointer-events-auto rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
            onClick={onHide}
          >
            <EyeSlashIcon className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          {...{ [NO_LIST_DRAG_ATTR]: "" }}
          className={`pointer-events-auto flex h-8 w-fit shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium ${LIST_BUTTON_HOVER_CLASS} ${color.className}`}
          style={color.style}
          onClick={onAddCard}
        >
          {/* Samma ikon som "Create card" i navbaren */}
          <PencilSquareIcon className="size-4" aria-hidden />
          Add a card
        </button>
      </div>
    </div>
  );
}
