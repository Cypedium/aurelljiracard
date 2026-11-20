import { z } from "zod";
import { HEX_COLOR, sanitizeHexColor } from "./color";

// Issue types are shared by everyone (GET /issue-type); admins add new ones. A card's type = the type's key
export type CardType = string;

// Icons a type can have; must match CardType.ICONS in server-java
export const ISSUE_TYPE_ICONS = ["check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb"] as const;
export type IssueTypeIconName = (typeof ISSUE_TYPE_ICONS)[number];

export type IssueType = { key: CardType; label: string; color: string; icon: IssueTypeIconName };

// The default types; must match CardType.DEFAULTS in server-java.
// Shown until the types have been fetched (and if fetching fails)
export const DEFAULT_ISSUE_TYPES: IssueType[] = [
  { key: "task", label: "Task", color: "#4bade8", icon: "check" },
  { key: "bug", label: "Bug", color: "#c9372c", icon: "bug" },
  { key: "doc", label: "Doc", color: "#8270db", icon: "doc" },
];

export const DEFAULT_CARD_TYPE: CardType = "task";

// The same limits and messages as server-java IssueTypeRequest
export const ISSUE_TYPE_LABEL_MAX_LENGTH = 30;
export const MAX_ISSUE_TYPES = 12;
const LABEL_MESSAGE = `Issue type name is required (max ${ISSUE_TYPE_LABEL_MAX_LENGTH} characters).`;

// Colours for a new type: dark enough for a white icon
export const ISSUE_TYPE_SWATCHES: { name: string; color: string }[] = [
  { name: "Blue", color: "#4bade8" },
  { name: "Green", color: "#1f845a" },
  { name: "Red", color: "#c9372c" },
  { name: "Purple", color: "#8270db" },
  { name: "Orange", color: "#e56910" },
  { name: "Teal", color: "#2898bd" },
  { name: "Magenta", color: "#ae4787" },
  { name: "Gray", color: "#626f86" },
];

const isIconName = (icon: unknown): icon is IssueTypeIconName =>
  typeof icon === "string" && (ISSUE_TYPE_ICONS as readonly string[]).includes(icon);

// The types from GET /issue-type: invalid ones and duplicates are dropped, an unknown icon becomes a check; none at all = the default types
export const normalizeIssueTypes = (raw: unknown): IssueType[] => {
  if (!Array.isArray(raw)) return DEFAULT_ISSUE_TYPES;
  const types: IssueType[] = [];
  for (const t of raw) {
    const key = t?.key;
    if (typeof key !== "string" || !key || types.some((x) => x.key === key)) continue;
    const label = typeof t.label === "string" && t.label.trim() ? t.label.trim().slice(0, ISSUE_TYPE_LABEL_MAX_LENGTH) : key;
    const color = sanitizeHexColor(t.color) ?? DEFAULT_ISSUE_TYPES[0].color;
    types.push({ key, label, color, icon: isIconName(t.icon) ? t.icon : "check" });
  }
  return types.length ? types : DEFAULT_ISSUE_TYPES;
};

// The card's type; an unknown or missing type (older cards, or before the types are fetched) shows as Task
export const issueTypeOf = (types: IssueType[], key?: string): IssueType =>
  types.find((t) => t.key === key) ??
  types.find((t) => t.key === DEFAULT_CARD_TYPE) ??
  DEFAULT_ISSUE_TYPES[0];

// A new type's name must not exist already (case and surrounding spaces don't matter)
export const DUPLICATE_ISSUE_TYPE_MESSAGE = "Issue type already exists.";

export const isTakenIssueTypeLabel = (types: Pick<IssueType, "label">[], label: string): boolean => {
  const name = label.trim().toLowerCase();
  return name !== "" && types.some((t) => t.label.trim().toLowerCase() === name);
};

// Number of cards per type; cards without a type count as Task. Types in use can't be deleted
export const countCardsByType = (cards: { type?: string }[]): Record<string, number> =>
  cards.reduce<Record<string, number>>((counts, { type }) => {
    const key = type || DEFAULT_CARD_TYPE;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

// Admin: the form for a new type (NewIssueTypeDialog)
export const issueTypeFormSchema = z.object({
  label: z.string().trim().min(1, LABEL_MESSAGE).max(ISSUE_TYPE_LABEL_MAX_LENGTH, LABEL_MESSAGE),
  color: z.string().regex(HEX_COLOR, "Please pick a color."),
  icon: z.enum(ISSUE_TYPE_ICONS, { message: "Please pick an icon." }),
});

export type IssueTypeFormValues = z.infer<typeof issueTypeFormSchema>;

export const EMPTY_ISSUE_TYPE_FORM: IssueTypeFormValues = {
  label: "",
  color: ISSUE_TYPE_SWATCHES[1].color,
  icon: "star",
};
