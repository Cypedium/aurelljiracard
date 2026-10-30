// Delade Tailwind-klasser för board och kortformulär
import { BugAntIcon, CheckIcon, DocumentTextIcon } from "@heroicons/react/16/solid";
import { readableTextColor, type BoardHeader, type CardStatus } from "./boardLayout";
import type { CardType } from "./cardType";
import type { PasswordStrength } from "./checkPasswordStrength";

// Board: datum, edit- och delete-knappen syns bara när man hovrar över kortet
// (alltid på pekskärmar, där det inte finns hover)
export const CARD_HOVER_CLASS =
  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";
// Trello-liknande färg per lista (bakgrund + text), nycklar = CardStatus
export const LIST_COLOR_CLASS: Record<CardStatus, string> = {
  todo: "bg-list-todo text-list-todo-text",
  "in-progress": "bg-list-progress text-list-progress-text",
  test: "bg-list-test text-list-test-text",
  done: "bg-list-done text-list-done-text",
};

// Listans färg: användarens egen (inline style, text med bäst kontrast) eller standardklassen
export const listColor = (header: BoardHeader): { className: string; style?: React.CSSProperties } =>
  header.color
    ? { className: "", style: { backgroundColor: header.color, color: readableTextColor(header.color) } }
    : { className: LIST_COLOR_CLASS[header.key] };

export const CARD_ACTION_CLASS =`no-drag rounded-[3px] px-1.5 py-1 text-jira-secondary hover:bg-jira-neutral ${CARD_HOVER_CLASS}`;

// Formulär: fälten är components/ui (Input, Textarea, Select); etiketterna stylas här
export const LABEL_CLASS = "mt-4 mb-1 block text-xs font-semibold text-jira-secondary";
// FormItem (components/ui/form): etiketten ger avståndet, felet visas tätt under fältet
export const FORM_ITEM_CLASS = "gap-0";
export const FIELD_ERROR_CLASS = "mt-1 text-xs text-jira-danger";
export const SECTION_PADDING = "px-6 max-[480px]:px-4";
// Login och register: vitt kort i samma stil som kortformuläret
export const AUTH_FORM_CLASS =
  "mx-4 flex w-full max-w-md flex-col rounded-xl bg-white p-6 font-jira text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)]";

// Jira-liknande ikon per ärendetyp: Task blå, Bug röd, Doc lila (IssueTypeIcon)
export const ISSUE_TYPE_STYLE: Record<CardType, { Icon: typeof CheckIcon; className: string }> = {
  task: { Icon: CheckIcon, className: "bg-jira-task" },
  bug: { Icon: BugAntIcon, className: "bg-jira-danger" },
  doc: { Icon: DocumentTextIcon, className: "bg-[#8270db]" },
};

// Färg på "Password strength" i registreringsformuläret
export const PASSWORD_STRENGTH_CLASS: Record<PasswordStrength, string> = {
  Weak: "text-red-600",
  Medium: "text-yellow-600",
  Strong: "text-green-600",
};
