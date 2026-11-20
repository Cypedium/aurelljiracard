import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import SummaryView from "../../components/SummaryView";
import { toPlainText } from "../../utils/summaryFormat";
import IssueTypeIcon from "../../components/IssueTypeIcon";
import type { Card } from "../../api/endpoints";

type Props = {
  card: Card;
  className?: string;
  style?: CSSProperties;
  // Extra content at the end of the bottom row (estimate, avatar)
  children?: ReactNode;
  // A row above the bottom row (edit/delete)
  actions?: ReactNode;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
};

// The card's face: summary, type and issue key. Shared by the board and the preview while a list is dragged
export default function CardFace({ card, className = "", style, children, actions, onDoubleClick }: Props) {
  const summary = toPlainText(card.comment);
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg bg-white p-3 text-sm text-jira-text shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] ${className}`}
      style={style}
      onDoubleClick={onDoubleClick}
    >
      {/* Formatted, three lines; the whole text without formatting on hover */}
      <div title={summary}>
        <SummaryView text={card.comment} compact />
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {/* Buttons (edit/delete) right-aligned above the bottom row */}
        {actions && <div className="flex justify-end">{actions}</div>}
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={card.type} />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-jira-secondary">
            {card.productId}
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}
