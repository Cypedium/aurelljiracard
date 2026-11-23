import type { PointerEvent as ReactPointerEvent } from "react";
import { EyeSlashIcon } from "@heroicons/react/16/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ColumnColorPicker from "../../components/ColumnColorPicker";
import { useLanguage } from "../../hooks/useLanguage";
import {
  CARDS_TOP,
  HEADER_HEIGHT,
  HEADER_TITLE_MAX_LENGTH,
  LIST_KEY_ATTR,
  NO_LIST_DRAG_ATTR,
  defaultListColor,
  listTitle,
  type BoardHeader,
} from "../../utils/boardLayout";
import { LIST_BUTTON_HOVER_CLASS, listColor } from "../../utils/styles";

type Props = {
  header: BoardHeader;
  // null while the board loads
  count: number | null;
  span: number;
  height: number;
  admin: boolean;
  renaming: boolean;
  // The list is lifted: the content is hidden, the placeholder is drawn in the background layer
  dragging: boolean;
  onDragStart: (e: ReactPointerEvent<HTMLElement>) => void;
  onStartRename: () => void;
  onRename: (title: string) => void;
  onRecolor: (color: string | null) => void;
  onHide: () => void;
  onAddCard: () => void;
  // Off when createCard is switched off: the button keeps its place, so the cards below don't move
  canAddCard?: boolean;
};

// A visible list's header (admin: click to rename, drag to move) and "Add a card"
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
  canAddCard = true,
}: Props) {
  const color = listColor(header);
  const { t } = useLanguage();
  // A default list's name in the current language. Saving it unchanged must not store the translation
  const title = listTitle(header, t);
  const rename = (value: string) => onRename(value === title ? header.title : value);

  return (
    <div
      {...{ [LIST_KEY_ATTR]: header.key }}
      className={`flex flex-col px-2 ${dragging ? "[&>*]:invisible" : ""}`}
      style={{ gridColumn: `span ${span}`, height }}
    >
      {/* Admin: drag anywhere in the header and the "Add a card" row to move the list (for everyone).
          Buttons have NO_LIST_DRAG_ATTR; a click on the name renames, dragging from it moves the list */}
      <div
        onPointerDown={admin && !renaming ? onDragStart : undefined}
        title={admin ? t("Drag to move the list (for everyone)") : undefined}
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
              aria-label={t("Column name")}
              maxLength={HEADER_TITLE_MAX_LENGTH}
              defaultValue={title}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => rename(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  // Undo: blur then saves the same name, i.e. nothing
                  e.currentTarget.value = title;
                  e.currentTarget.blur();
                }
              }}
              className="pointer-events-auto min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm font-semibold text-jira-text ring-2 ring-jira-focus outline-none"
            />
          ) : admin ? (
            <button
              type="button"
              title={t("Click to rename (for everyone)")}
              className="pointer-events-auto min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold"
              onClick={onStartRename}
            >
              <span className="inline-block hover:bg-black/10 rounded px-1">{title}</span>
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate px-2 py-1 text-sm font-semibold" title={title}>
              {title}
            </span>
          )}
          <span className="text-sm opacity-80">{count}</span>
          {admin && (
            <span className="contents" {...{ [NO_LIST_DRAG_ATTR]: "" }}>
              <ColumnColorPicker
                title={title}
                color={header.color}
                defaultColor={defaultListColor(header.key)}
                onChange={onRecolor}
              />
            </span>
          )}
          <button
            type="button"
            aria-label={t("Hide {title}", { title })}
            aria-expanded
            title={t("Hide list")}
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
          className={`pointer-events-auto flex h-8 w-fit shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium ${LIST_BUTTON_HOVER_CLASS} ${color.className} ${canAddCard ? "" : "invisible"}`}
          style={color.style}
          onClick={onAddCard}
          disabled={!canAddCard}
          aria-hidden={!canAddCard || undefined}
        >
          {/* The same icon as "Create card" in the navbar */}
          <PencilSquareIcon className="size-4" aria-hidden />
          {t("Add a card")}
        </button>
      </div>
    </div>
  );
}
