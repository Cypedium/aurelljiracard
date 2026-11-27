// Shared Tailwind classes for the board and the card form
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
import { NEW_LIST_COLOR, type BoardHeader, type CardStatus } from "./boardLayout";
import { readableTextColor } from "./color";
import type { IssueTypeIconName } from "./cardType";
import type { PasswordStrength } from "./checkPasswordStrength";

// Board: the date and the edit and delete buttons only show when you hover over the card
// (always on touch screens, where there is no hover)
export const CARD_HOVER_CLASS =
  "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";
// Trello-like colour per default list (background + text), keys = CardStatus
export const LIST_COLOR_CLASS: Record<CardStatus, string> = {
  todo: "bg-list-todo text-list-todo-text",
  "in-progress": "bg-list-progress text-list-progress-text",
  test: "bg-list-test text-list-test-text",
  done: "bg-list-done text-list-done-text",
};

// Darker on hover even when the list colour is an inline style (which beats hover:bg-*):
// a background image is drawn on top of the background colour and covers only the button
export const LIST_BUTTON_HOVER_CLASS =
  "hover:bg-[linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1))]";

const inlineListColor = (color: string) => ({
  className: "",
  style: { backgroundColor: color, color: readableTextColor(color) },
});

// The list's colour: the chosen colour (inline style, text with the best contrast), the default class,
// or grey for lists that were added
export const listColor = (header: BoardHeader): { className: string; style?: React.CSSProperties } =>
  header.color
    ? inlineListColor(header.color)
    : LIST_COLOR_CLASS[header.key]
      ? { className: LIST_COLOR_CLASS[header.key] }
      : inlineListColor(NEW_LIST_COLOR);

export const CARD_ACTION_CLASS =`no-drag rounded-[3px] px-1.5 py-1 text-jira-secondary hover:bg-jira-neutral ${CARD_HOVER_CLASS}`;

// Forms: the fields are components/ui (Input, Textarea, Select); the labels are styled here
export const LABEL_CLASS = "mt-4 mb-1 block text-xs font-semibold text-jira-secondary";
// FormItem (components/ui/form): the label gives the spacing, the error shows right below the field
export const FORM_ITEM_CLASS = "gap-0";
export const FIELD_ERROR_CLASS = "mt-1 text-xs text-jira-danger";
export const SECTION_PADDING = "px-6 max-[480px]:px-4";
// The raised white card behind every form (card, issue type, user, login)
const FORM_SHADOW = "shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)]";
// JiraFormCard: the card, its gradient header (the board's colours) and the body
export const FORM_CARD_CLASS = `w-full overflow-hidden rounded-xl bg-white font-jira text-sm text-jira-text ${FORM_SHADOW}`;
export const FORM_HEADER_CLASS = `${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`;
export const FORM_BODY_CLASS = `${SECTION_PADDING} flex flex-col pb-4`;
// The submit button: the same blue as the header's gradient
export const FORM_SUBMIT_CLASS = "bg-board-via px-4 hover:bg-board-from";
// Login and register: a white card in the same style as the card form
// "Back to login" under the auth forms, and a link that looks like the primary button
export const AUTH_LINK_CLASS = "mt-4 self-center text-sm text-jira-secondary hover:underline";
export const AUTH_BUTTON_LINK_CLASS =
  "mt-6 inline-block rounded-[3px] bg-jira-primary px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-jira-primary-hover";
export const AUTH_FORM_CLASS =
  `mx-4 flex w-full max-w-md flex-col rounded-xl bg-white p-6 font-jira text-sm text-jira-text ${FORM_SHADOW}`;

// The summary editor (SummaryEditor, Tiptap): a box like the text fields, toolbar above
export const SUMMARY_EDITOR_BOX_CLASS =
  "relative min-h-[88px] rounded-md border border-input bg-white px-3 py-2 text-sm text-jira-text focus-within:border-jira-focus focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-jira-danger";
// The writing area fills the box, so a click anywhere in it places the cursor
export const SUMMARY_EDITOR_CONTENT_CLASS = "min-h-[70px] cursor-text";
export const SUMMARY_PLACEHOLDER_CLASS = "pointer-events-none absolute top-2 left-3 text-sm text-jira-subtle";
export const EDITOR_TOOL_CLASS =
  "inline-flex size-7 items-center justify-center rounded-[3px] text-jira-secondary hover:bg-jira-neutral aria-pressed:bg-jira-info aria-pressed:text-jira-primary";

// Icon per issue type (IssueTypeIcon); the background is the type's colour
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

// Colour of "Password strength" in the registration form
export const PASSWORD_STRENGTH_CLASS: Record<PasswordStrength, string> = {
  Weak: "text-red-600",
  Medium: "text-yellow-600",
  Strong: "text-green-600",
};

// Show/hide password button inside the password field (the input gets pr-9 to make room)
export const PASSWORD_TOGGLE_CLASS =
  "absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-jira-secondary hover:text-jira-text focus-visible:outline-2 focus-visible:outline-jira-primary";

// Tables (Users, Backlog): white box, header row in small grey capitals
export const TABLE_WRAPPER_CLASS =
  "overflow-hidden rounded-lg bg-white shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]";

// Icon button in a table row (Users, Issue types): edit, delete, log out
export const TABLE_ACTION_CLASS =
  "rounded-[3px] p-1.5 text-jira-secondary hover:bg-jira-neutral disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
// The table head has the same background as the navbar's top row (bg-gray-600), with white text
export const TABLE_THEAD_CLASS = "bg-gray-600";
export const TABLE_HEAD_CLASS = "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white";
export const TABLE_CELL_CLASS = "px-4 py-3";
export const TABLE_ROW_CLASS = "border-b border-jira-neutral last:border-b-0 hover:bg-jira-hover";

// The navbar's board switcher (open list): same theme as the navbar (the row below, the navbar's text colour).
// ! wins over the shadcn default colours (bg-popover, focus:bg-accent, text-muted-foreground)
export const NAV_MENU_CLASS = "border-white/20 bg-nav-sub! font-jira text-nav-text! [&_svg]:text-current!";
export const NAV_MENU_ITEM_CLASS = "focus:bg-white/15! focus:text-nav-text!";
export const NAV_MENU_LABEL_CLASS = "text-xs text-nav-text/70!";
export const NAV_MENU_SEPARATOR_CLASS = "bg-white/20!";

// The navbar's links: icon before the text (like Trello's side menu); lighter background on hover, like the buttons in row two
export const NAV_LINK_CLASS =
  "flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/10 focus-visible:bg-white/10";
// The page links (Board, Backlog …): underlined when you are on the page
export const NAV_PAGE_LINK_CLASS = `${NAV_LINK_CLASS} underline-offset-8 aria-[current=page]:underline`;
export const NAV_ICON_CLASS = "size-5 shrink-0";
export const NAV_ICON_SUB_CLASS = "size-4 shrink-0";
export const NAV_SUB_ROW_BUTTON_CLASS = "flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-white/10";
// Mobile: row two's buttons show in the hamburger menu, indented under the page's link
export const NAV_MOBILE_SUB_LIST_CLASS = "mt-2 ml-7 flex flex-col gap-2 text-lg md:hidden";

// The account button in the navbar: user icon + initials, lighter than the navbar and in the navbar's text colour (follows the theme)
// Mobile: only the user icon, no background; desktop: round button with icon and initials
export const NAV_ACCOUNT_BUTTON_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-full md:bg-white/15 md:w-auto md:justify-start md:pr-3 md:pl-2 font-jira text-xs font-semibold text-nav-text transition-colors hover:bg-white/25 focus-visible:bg-white/25";

// The account menu: the navbar's colours (.nav-theme in root.css)
export const ACCOUNT_MENU_CLASS = "nav-theme relative w-[min(300px,calc(100vw-24px))] p-0 font-jira text-jira-text";
// align="end" is pushed this far to the right; Radix then moves the menu back inside the window, so it lines up with the screen's right edge
export const ACCOUNT_MENU_ALIGN_OFFSET = -200;
// The avatar in the menu: light grey with white text
export const ACCOUNT_AVATAR_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-gray-500 font-jira font-semibold text-white";
export const ACCOUNT_MENU_HEADING_CLASS =
  "px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-jira-secondary";
export const ACCOUNT_MENU_ITEM_CLASS =
  "flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-jira-hover focus-visible:bg-jira-hover focus-visible:outline-none";
// Selected row (panel open): blue with a border on the left, as in Trello
export const ACCOUNT_MENU_ACTIVE_ITEM_CLASS =
  "bg-jira-info text-jira-primary shadow-[inset_2px_0_0_var(--color-jira-primary)] hover:bg-jira-info";
// The language switch's flags: the chosen one lit up with a ring, the other faded
export const LANGUAGE_OPTION_CLASS =
  "flex rounded px-1.5 py-1 opacity-50 grayscale-[40%] transition hover:opacity-100 hover:grayscale-0 aria-checked:opacity-100 aria-checked:grayscale-0 aria-checked:ring-2 aria-checked:ring-jira-primary focus-visible:outline-2 focus-visible:outline-jira-focus";
export const LANGUAGE_FLAG_CLASS = "h-4 w-auto rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]";

// The colour pickers in the account menu (board background, navbar colour)
export const PICKER_GROUP_HEADING_CLASS = "text-xs font-semibold uppercase text-jira-secondary";
export const PICKER_SWATCH_CLASS =
  "relative rounded-md shadow-[inset_0_0_0_1px_rgba(9,30,66,0.15)] transition-[filter] hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jira-focus";
