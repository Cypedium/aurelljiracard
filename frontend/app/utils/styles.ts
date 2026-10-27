// Delade Tailwind-klasser för board och kortformulär
import type { CardStatus } from "./boardLayout";

// Board: datum, edit- och delete-knappen syns bara när man hovrar över kortet
export const CARD_HOVER_CLASS =
  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";
// Trello-liknande färg per lista (bakgrund + text), nycklar = CardStatus
export const LIST_COLOR_CLASS: Record<CardStatus, string> = {
  todo: "bg-list-todo text-list-todo-text",
  "in-progress": "bg-list-progress text-list-progress-text",
  test: "bg-list-test text-list-test-text",
  done: "bg-list-done text-list-done-text",
};

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
