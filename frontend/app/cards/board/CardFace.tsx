import type { CSSProperties, ReactNode } from "react";
import IssueTypeIcon from "../../components/IssueTypeIcon";
import type { Card } from "../../api/endpoints";

type Props = {
  card: Card;
  className?: string;
  style?: CSSProperties;
  // Extra innehåll sist i nedre raden (datum, knappar, estimat, avatar)
  children?: ReactNode;
};

// Kortets yta: sammanfattning, typ och issue key. Delas av boarden och förhandsvisningen när en lista dras
export default function CardFace({ card, className = "", style, children }: Props) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg bg-white p-3 text-sm text-jira-text shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] ${className}`}
      style={style}
    >
      <p className="line-clamp-3 leading-5 wrap-anywhere" title={card.comment}>
        {card.comment}
      </p>

      <div className="mt-auto flex items-center gap-1.5">
        <IssueTypeIcon type={card.type} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-jira-secondary">
          {card.productId}
        </span>
        {children}
      </div>
    </div>
  );
}
