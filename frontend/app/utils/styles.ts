// Delade Tailwind-klasser för board och kortformulär
import {
  BoltIcon,
  BugAntIcon,
  CheckIcon,
  DocumentTextIcon,
  FlagIcon,
  LightBulbIcon,
  StarIcon,
  WrenchIcon,
} from "@heroicons/react/16/solid";
import { NEW_LIST_COLOR, readableTextColor, type BoardHeader, type CardStatus } from "./boardLayout";
import type { IssueTypeIconName } from "./cardType";
import type { PasswordStrength } from "./checkPasswordStrength";

// Board: datum, edit- och delete-knappen syns bara när man hovrar över kortet
// (alltid på pekskärmar, där det inte finns hover)
export const CARD_HOVER_CLASS =
  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";
// Trello-liknande färg per standardlista (bakgrund + text), nycklar = CardStatus
export const LIST_COLOR_CLASS: Record<CardStatus, string> = {
  todo: "bg-list-todo text-list-todo-text",
  "in-progress": "bg-list-progress text-list-progress-text",
  test: "bg-list-test text-list-test-text",
  done: "bg-list-done text-list-done-text",
};

// Mörkare vid hover även när listfärgen är en inline style (som slår hover:bg-*):
// en bakgrundsbild ritas ovanpå bakgrundsfärgen och täcker bara knappen
export const LIST_BUTTON_HOVER_CLASS =
  "hover:bg-[linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1))]";

const inlineListColor = (color: string) => ({
  className: "",
  style: { backgroundColor: color, color: readableTextColor(color) },
});

// Listans färg: vald färg (inline style, text med bäst kontrast), standardklassen,
// eller grått för listor som lagts till
export const listColor = (header: BoardHeader): { className: string; style?: React.CSSProperties } =>
  header.color
    ? inlineListColor(header.color)
    : LIST_COLOR_CLASS[header.key]
      ? { className: LIST_COLOR_CLASS[header.key] }
      : inlineListColor(NEW_LIST_COLOR);

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

// Ikon per ärendetyp (IssueTypeIcon); bakgrunden är typens färg
export const ISSUE_TYPE_ICON: Record<IssueTypeIconName, typeof CheckIcon> = {
  check: CheckIcon,
  bug: BugAntIcon,
  doc: DocumentTextIcon,
  bolt: BoltIcon,
  star: StarIcon,
  flag: FlagIcon,
  wrench: WrenchIcon,
  "light-bulb": LightBulbIcon,
};

// Färg på "Password strength" i registreringsformuläret
export const PASSWORD_STRENGTH_CLASS: Record<PasswordStrength, string> = {
  Weak: "text-red-600",
  Medium: "text-yellow-600",
  Strong: "text-green-600",
};

// Tabeller (Users, Backlog): vit ruta, rubrikrad med små grå versaler
export const TABLE_WRAPPER_CLASS =
  "overflow-hidden rounded-lg bg-white shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]";
// Tabellhuvudet har samma bakgrund som navbarens övre rad (bg-gray-600), med vit text
export const TABLE_THEAD_CLASS = "bg-gray-600";
export const TABLE_HEAD_CLASS = "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white";
export const TABLE_CELL_CLASS = "px-4 py-3";
export const TABLE_ROW_CLASS = "border-b border-jira-neutral last:border-b-0 hover:bg-[#f7f8f9]";

// Navbarens boardväljare (öppen lista): samma tema som navbaren (raden under, navbarens textfärg).
// ! går före shadcn-standardfärgerna (bg-popover, focus:bg-accent, text-muted-foreground)
export const NAV_MENU_CLASS = "border-white/20 bg-nav-sub! font-jira text-nav-text! [&_svg]:text-current!";
export const NAV_MENU_ITEM_CLASS = "focus:bg-white/15! focus:text-nav-text!";
export const NAV_MENU_LABEL_CLASS = "text-xs text-nav-text/70!";
export const NAV_MENU_SEPARATOR_CLASS = "bg-white/20!";
