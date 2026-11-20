// Feature switches and read-only mode (docs/feature-switches.md). The backend (server-java) refuses with 503;
// here the buttons are only hidden to match. The navbar switches (UI-only) hide links and settings.
import { BOARD_ACTIONS, type BoardAction } from "./boardActions";

// Must match the Feature enum in server-java (the API keys; read-only mode is called "readOnly" and stands on its own)
export const ENFORCED_FEATURE_KEYS = [
  "register",
  "createCard",
  "editCard",
  "deleteCard",
  "createColumn",
  "deleteColumn",
  "editColumns",
  "manageIssueTypes",
  "shareBoard",
  "joinBoard",
  "googleConnect",
] as const;
export const NAVBAR_FEATURE_KEYS = [
  "backlogPage",
  "boardSwitcher",
  "issueTypesPage",
  "boardBackground",
  "navbarColour",
] as const;
export const FEATURE_KEYS = [...ENFORCED_FEATURE_KEYS, ...NAVBAR_FEATURE_KEYS] as const;
export const READ_ONLY_KEY = "readOnly";

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type SwitchKey = FeatureKey | typeof READ_ONLY_KEY;

// A switch on the admin page. readOnly: enabled = read-only mode is on; otherwise = the feature is on
export type FeatureSwitch = {
  key: SwitchKey;
  enabled: boolean;
  uiOnly: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type FeatureState = {
  readOnly: boolean;
  disabled: FeatureKey[];
  // Site admin only
  switches?: FeatureSwitch[];
};

// If GET /feature fails (e.g. an older backend) everything is on: the UI is never blocked by a missing list
export const ALL_ON: FeatureState = { readOnly: false, disabled: [] };

const isFeatureKey = (key: unknown): key is FeatureKey => (FEATURE_KEYS as readonly unknown[]).includes(key);
const isSwitchKey = (key: unknown): key is SwitchKey => key === READ_ONLY_KEY || isFeatureKey(key);
export const isNavbarFeature = (key: SwitchKey): boolean => (NAVBAR_FEATURE_KEYS as readonly string[]).includes(key);

// The backend's response, read leniently: unknown keys and wrong types are ignored
export const parseFeatureState = (data: unknown): FeatureState => {
  if (!data || typeof data !== "object") return ALL_ON;
  const raw = data as Record<string, unknown>;
  const disabled = Array.isArray(raw.disabled) ? raw.disabled.filter(isFeatureKey) : [];
  const state: FeatureState = { readOnly: raw.readOnly === true, disabled };
  if (Array.isArray(raw.switches)) {
    state.switches = raw.switches.filter(
      (s): s is FeatureSwitch => Boolean(s) && typeof s === "object" && isSwitchKey((s as FeatureSwitch).key)
    );
  }
  return state;
};

// The site admin sees everything. The navbar switches are not affected by read-only (they are not writes)
export const isFeatureOn = (state: FeatureState, key: FeatureKey, siteAdmin: boolean): boolean => {
  if (siteAdmin) return true;
  if (state.disabled.includes(key)) return false;
  return isNavbarFeature(key) || !state.readOnly;
};

// Writes without their own switch (e.g. the order of the cards, PUT /user/layout) are only stopped by read-only
export const canWrite = (state: FeatureState, siteAdmin: boolean): boolean => siteAdmin || !state.readOnly;

// "Changed by root, 19 Nov 14:32" on the admin page; null if the switch was never changed.
// A deleted admin gives only the time
export const featureChangedLabel = (sw: Pick<FeatureSwitch, "updatedAt" | "updatedBy"> | undefined, locale = "en-GB"): string | null => {
  if (!sw?.updatedAt) return null;
  const when = new Date(sw.updatedAt);
  if (Number.isNaN(when.getTime())) return null;
  const time = when.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return sw.updatedBy ? `Changed by ${sw.updatedBy}, ${time}` : `Changed ${time}`;
};

// The navbar's buttons → their switch
export const BOARD_ACTION_FEATURES: Record<BoardAction, FeatureKey> = {
  [BOARD_ACTIONS.createCard]: "createCard",
  [BOARD_ACTIONS.createColumn]: "createColumn",
  [BOARD_ACTIONS.deleteColumn]: "deleteColumn",
  [BOARD_ACTIONS.shareBoard]: "shareBoard",
  [BOARD_ACTIONS.createIssueType]: "manageIssueTypes",
};

// The admin page: groups, names and what is hidden/stopped (the same text as in docs/feature-switches.md)
export type FeatureInfo = { key: SwitchKey; name: string; hides: string; blocks: string };
export type FeatureGroup = { title: string; uiOnly: boolean; features: FeatureInfo[] };

export const READ_ONLY_INFO: FeatureInfo = {
  key: READ_ONLY_KEY,
  name: "Read-only mode",
  hides: "Shows a banner; every create, edit, delete and drag is off",
  blocks: "Every write except login, refresh and logout",
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Accounts",
    uiOnly: false,
    features: [
      { key: "register", name: "Registration", hides: "“Register User” link; the register page shows a message", blocks: "POST /auth/register, first Google sign-in" },
      { key: "joinBoard", name: "Join boards", hides: "Invite page shows “temporarily disabled”", blocks: "POST /invite/{token}" },
      { key: "googleConnect", name: "Connect Google", hides: "“Google sign-in” in the account menu", blocks: "POST /user/google" },
    ],
  },
  {
    title: "Navbar second row",
    uiOnly: false,
    features: [
      { key: "createCard", name: "Create card", hides: "“Create card”", blocks: "POST /board/{id}/card" },
      { key: "createColumn", name: "Create column", hides: "“Create column”", blocks: "POST /board/{id}/column" },
      { key: "deleteColumn", name: "Delete column", hides: "“Delete column”", blocks: "DELETE /board/{id}/column/{key}" },
      { key: "shareBoard", name: "Share", hides: "“Share” / “Members” (also leaving a board)", blocks: "POST/DELETE …/invite, DELETE …/member/{userId}" },
    ],
  },
  {
    title: "Board",
    uiOnly: false,
    features: [
      { key: "editCard", name: "Edit cards", hides: "Edit in the card dialog, dragging cards", blocks: "PUT …/card/{id}, PATCH …/card/{id}/status" },
      { key: "deleteCard", name: "Delete cards", hides: "Delete in the card dialog", blocks: "DELETE …/card/{id}" },
      { key: "editColumns", name: "Edit lists", hides: "Rename/recolour in the list header, dragging list headers", blocks: "PUT /board/{id}/column/{key}, PUT /board/{id}/column" },
      { key: "manageIssueTypes", name: "Manage issue types", hides: "“Create Issue type”, delete on the Issue types page", blocks: "POST, DELETE /board/{id}/issue-type" },
    ],
  },
  {
    title: "Navbar",
    uiOnly: true,
    features: [
      { key: "backlogPage", name: "Backlog", hides: "“Backlog” link, the Backlog choice in the card form; /backlog shows “turned off”", blocks: "GET /board/{id}/card" },
      { key: "boardSwitcher", name: "Board switcher", hides: "The board dropdown", blocks: "The Board link; the board last chosen stays shown" },
      { key: "issueTypesPage", name: "Issue types page", hides: "“Issue types” link; /issue-types shows “turned off”", blocks: "Creating types from the card form (Manage issue types)" },
      { key: "boardBackground", name: "Board background", hides: "“Board background” in the account menu", blocks: "The saved background keeps applying" },
      { key: "navbarColour", name: "Navbar colour", hides: "“Navbar colour” in the account menu", blocks: "The saved colour keeps applying" },
    ],
  },
];
