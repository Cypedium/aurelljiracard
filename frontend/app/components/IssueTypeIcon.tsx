import { BugAntIcon, CheckIcon, DocumentTextIcon } from "@heroicons/react/16/solid";
import { cardTypeLabel, cardTypeOf, type CardType } from "../utils/cardType";

// Jira-liknande ikon per ärendetyp: Task blå, Bug röd, Doc lila
const TYPE_STYLE: Record<CardType, { Icon: typeof CheckIcon; className: string }> = {
  task: { Icon: CheckIcon, className: "bg-jira-task" },
  bug: { Icon: BugAntIcon, className: "bg-jira-danger" },
  doc: { Icon: DocumentTextIcon, className: "bg-[#8270db]" },
};

export default function IssueTypeIcon({ type }: { type?: string }) {
  const { Icon, className } = TYPE_STYLE[cardTypeOf(type)];
  return (
    <span
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] text-white ${className}`}
      title={cardTypeLabel(type)}
    >
      <Icon className="size-3" aria-hidden />
    </span>
  );
}
