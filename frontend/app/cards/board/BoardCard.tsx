import { PencilIcon, TrashIcon } from "@heroicons/react/16/solid";
import type { Card } from "../../api/endpoints";
import { avatarColor, avatarInitials } from "../../utils/avatar";
import { assigneeOf } from "../../utils/backlog";
import { formatShortDate } from "../../utils/date";
import { CARD_ACTION_CLASS, CARD_HOVER_CLASS } from "../../utils/styles";
import CardFace from "./CardFace";

type Props = {
  card: Card;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

// Ett kort på boarden. Ytterdiven (som react-grid-layout styr) ligger kvar i Cards.tsx
export default function BoardCard({ card, canEdit, canDelete, onEdit, onDelete }: Props) {
  const assignee = assigneeOf(card);

  return (
    <CardFace
      card={card}
      className="group relative h-full cursor-grab overflow-hidden hover:ring-2 hover:ring-jira-focus hover:ring-inset"
    >
      {/* Datum, edit och delete (syns vid hover) */}
      <span className={`shrink-0 rounded-[3px] text-xs/5 font-bold text-jira-secondary ${CARD_HOVER_CLASS}`}>
        {formatShortDate(card.submittedAt)}
      </span>

      <div className="flex shrink-0 items-center">
        {/* Edit och delete på egna kort, eller alla för admin */}
        {canEdit && (
          <button className={CARD_ACTION_CLASS} aria-label="Edit card" title="Edit" onClick={onEdit}>
            <PencilIcon className="size-4" aria-hidden />
          </button>
        )}
        {canDelete && (
          <button className={CARD_ACTION_CLASS} aria-label="Delete card" title="Delete" onClick={onDelete}>
            <TrashIcon className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <span
        className="min-w-5 shrink-0 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
        title={`Time tracking: ${card.rating}/5`}
      >
        {card.rating}
      </span>
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ background: avatarColor(assignee) }}
        title={`Assignee: ${assignee}`}
      >
        {avatarInitials(assignee)}
      </span>
    </CardFace>
  );
}
