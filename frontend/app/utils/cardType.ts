import { z } from "zod";
import { HEX_COLOR } from "./boardLayout";

// Ärendetyper delas av alla (GET /issue-type); admins lägger till nya. Kortets type = typens key
export type CardType = string;

// Ikoner en typ kan ha; måste matcha ISSUE_TYPE_ICONS i server/utils/cardType.js och CardType.ICONS i server-java
export const ISSUE_TYPE_ICONS = ["check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb"] as const;
export type IssueTypeIconName = (typeof ISSUE_TYPE_ICONS)[number];

export type IssueType = { key: CardType; label: string; color: string; icon: IssueTypeIconName };

// Standardtyperna; måste matcha DEFAULT_ISSUE_TYPES i server/utils/cardType.js och V8__issue_types.sql.
// Visas tills typerna har hämtats (och om hämtningen misslyckas)
export const DEFAULT_ISSUE_TYPES: IssueType[] = [
  { key: "task", label: "Task", color: "#4bade8", icon: "check" },
  { key: "bug", label: "Bug", color: "#c9372c", icon: "bug" },
  { key: "doc", label: "Doc", color: "#8270db", icon: "doc" },
];

export const DEFAULT_CARD_TYPE: CardType = "task";

// Samma gränser och meddelanden som server/controllers/issueTypeController.js
export const ISSUE_TYPE_LABEL_MAX_LENGTH = 30;
export const MAX_ISSUE_TYPES = 12;
const LABEL_MESSAGE = `Issue type name is required (max ${ISSUE_TYPE_LABEL_MAX_LENGTH} characters).`;

// Färger för en ny typ: mörka nog för en vit ikon
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

// Typerna från GET /issue-type: ogiltiga och dubbletter tas bort, okänd ikon blir en bock; inga alls = standardtyperna
export const normalizeIssueTypes = (raw: unknown): IssueType[] => {
  if (!Array.isArray(raw)) return DEFAULT_ISSUE_TYPES;
  const types: IssueType[] = [];
  for (const t of raw) {
    const key = t?.key;
    if (typeof key !== "string" || !key || types.some((x) => x.key === key)) continue;
    const label = typeof t.label === "string" && t.label.trim() ? t.label.trim().slice(0, ISSUE_TYPE_LABEL_MAX_LENGTH) : key;
    const color = typeof t.color === "string" && HEX_COLOR.test(t.color) ? t.color.toLowerCase() : DEFAULT_ISSUE_TYPES[0].color;
    types.push({ key, label, color, icon: isIconName(t.icon) ? t.icon : "check" });
  }
  return types.length ? types : DEFAULT_ISSUE_TYPES;
};

// Kortets typ; okänd eller saknad typ (äldre kort, eller innan typerna hämtats) visas som Task
export const issueTypeOf = (types: IssueType[], key?: string): IssueType =>
  types.find((t) => t.key === key) ??
  types.find((t) => t.key === DEFAULT_CARD_TYPE) ??
  DEFAULT_ISSUE_TYPES[0];

// Admin: formuläret för en ny typ (NewIssueTypeDialog)
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
