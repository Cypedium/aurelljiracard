'use client';
import { useIssueTypes } from "../hooks/useIssueTypes";
import { useLanguage } from "../hooks/useLanguage";
import { issueTypeLabel, issueTypeOf, type IssueType } from "../utils/cardType";
import { ISSUE_TYPE_ICON } from "../utils/styles";

// The card's type (key), or a type directly (the preview in NewIssueTypeDialog)
type Props = { type?: string; issueType?: Pick<IssueType, "label" | "color" | "icon"> };

export default function IssueTypeIcon({ type, issueType }: Props) {
  const types = useIssueTypes();
  const { t } = useLanguage();
  // The preview's label is as typed; a board type's default label is translated
  const { color, icon } = issueType ?? issueTypeOf(types, type);
  const label = issueType ? issueType.label : issueTypeLabel(issueTypeOf(types, type), t);
  const Icon = ISSUE_TYPE_ICON[icon];
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] text-white"
      style={{ background: color }}
      title={label}
    >
      {/* text-white on the svg: otherwise SelectItem makes the icon grey (text-muted-foreground) */}
      <Icon className="size-3 text-white" aria-hidden />
    </span>
  );
}
