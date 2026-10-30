import { cardTypeLabel, cardTypeOf } from "../utils/cardType";
import { ISSUE_TYPE_STYLE } from "../utils/styles";

export default function IssueTypeIcon({ type }: { type?: string }) {
  const { Icon, className } = ISSUE_TYPE_STYLE[cardTypeOf(type)];
  return (
    <span
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] text-white ${className}`}
      title={cardTypeLabel(type)}
    >
      {/* text-white på svg:n: annars gör SelectItem ikonen grå (text-muted-foreground) */}
      <Icon className="size-3 text-white" aria-hidden />
    </span>
  );
}
