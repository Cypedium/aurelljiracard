import { PencilIcon, TrashIcon } from "@heroicons/react/16/solid";
import type { Card } from "../../api/endpoints";
import { avatarColor, avatarInitials } from "../../utils/avatar";
import { assigneeOf } from "../../utils/backlog";
import { CARD_ACTION_CLASS } from "../../utils/styles";
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

  // Edit och delete (syns vid hover) på egna kort, eller alla för admin. Datumet visas i edit-dialogen
  const actions =
    canEdit || canDelete ? (
      <div className="flex shrink-0 items-center">
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
    ) : null;

  return (
    <CardFace
      card={card}
      actions={actions}
      className="group relative h-full cursor-grab overflow-hidden hover:ring-2 hover:ring-jira-focus hover:ring-inset"
    >
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
