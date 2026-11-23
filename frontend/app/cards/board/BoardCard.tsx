import { PencilIcon, TrashIcon } from "@heroicons/react/16/solid";
import type { MouseEvent } from "react";
import type { Card } from "../../api/endpoints";
import { avatarColor, avatarInitials } from "../../utils/avatar";
import { assigneeOf } from "../../utils/backlog";
import { CARD_ACTION_CLASS } from "../../utils/styles";
import CardFace from "./CardFace";
import { useLanguage } from "../../hooks/useLanguage";

type Props = {
  card: Card;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

// A card on the board. The outer div (which react-grid-layout controls) stays in Cards.tsx
export default function BoardCard({ card, canEdit, canDelete, onEdit, onDelete }: Props) {
  const assignee = assigneeOf(card);
  const { t } = useLanguage();

  // Edit and delete (shown on hover) on your own cards, or all of them for the admin. The date is shown in the edit dialog
  const actions =
    canEdit || canDelete ? (
      <div className="flex shrink-0 items-center">
        {canEdit && (
          <button className={CARD_ACTION_CLASS} aria-label={t("Edit card")} title={t("Edit")} onClick={onEdit}>
            <PencilIcon className="size-4" aria-hidden />
          </button>
        )}
        {canDelete && (
          <button className={CARD_ACTION_CLASS} aria-label={t("Delete card")} title={t("Delete")} onClick={onDelete}>
            <TrashIcon className="size-4" aria-hidden />
          </button>
        )}
      </div>
    ) : null;

  // A double click opens the edit dialog, for the same users who see the edit button (the reporter or the admin).
  // Not on the buttons: two quick clicks on delete must not also open edit
  const editOnDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    // Otherwise the double click selects a word in the summary
    window.getSelection()?.removeAllRanges();
    onEdit();
  };

  return (
    <CardFace
      card={card}
      actions={actions}
      onDoubleClick={canEdit ? editOnDoubleClick : undefined}
      className="group relative h-full cursor-grab overflow-hidden hover:ring-2 hover:ring-jira-focus hover:ring-inset"
    >
      <span
        className="min-w-5 shrink-0 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
        title={t("Time tracking: {rating}/5", { rating: card.rating })}
      >
        {card.rating}
      </span>
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: avatarColor(assignee) }}
        title={t("Assignee: {assignee}", { assignee })}
      >
        {avatarInitials(assignee)}
      </span>
    </CardFace>
  );
}
