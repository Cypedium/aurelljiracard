// Feature switches and read-only mode (docs/feature-switches.md). The backend (server-java) refuses with 503;
// here the buttons are only hidden to match. The navbar switches (UI-only) hide links and settings.
import { BOARD_ACTIONS, type BoardAction } from "./boardActions";
import { interpolate, msg, type Translate } from "./i18n";

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
export const featureChangedLabel = (
  sw: Pick<FeatureSwitch, "updatedAt" | "updatedBy"> | undefined,
  locale = "en-GB",
  t: Translate = interpolate,
): string | null => {
  if (!sw?.updatedAt) return null;
  const when = new Date(sw.updatedAt);
  if (Number.isNaN(when.getTime())) return null;
  const time = when.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return sw.updatedBy
    ? t(msg("Changed by {user}, {time}"), { user: sw.updatedBy, time })
    : t(msg("Changed {time}"), { time });
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
  name: msg("Read-only mode"),
  hides: msg("Shows a banner; every create, edit, delete and drag is off"),
  blocks: msg("Every write except login, refresh and logout"),
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: msg("Accounts"),
    uiOnly: false,
    features: [
      { key: "register", name: msg("Registration"), hides: msg("“Register User” link; the register page shows a message"), blocks: msg("POST /auth/register, first Google sign-in") },
      { key: "joinBoard", name: msg("Join boards"), hides: msg("Invite page shows “temporarily disabled”"), blocks: msg("POST /invite/{token}") },
      { key: "googleConnect", name: msg("Connect Google"), hides: msg("“Google sign-in” in the account menu"), blocks: msg("POST /user/google") },
    ],
  },
  {
    title: msg("Navbar second row"),
    uiOnly: false,
    features: [
      { key: "createCard", name: msg("Create card"), hides: msg("“Create card”"), blocks: msg("POST /board/{id}/card") },
      { key: "createColumn", name: msg("Create column"), hides: msg("“Create column”"), blocks: msg("POST /board/{id}/column") },
      { key: "deleteColumn", name: msg("Delete column"), hides: msg("“Delete column”"), blocks: msg("DELETE /board/{id}/column/{key}") },
      { key: "shareBoard", name: msg("Share"), hides: msg("“Share” / “Members” (also leaving a board)"), blocks: msg("POST/DELETE …/invite, DELETE …/member/{userId}") },
    ],
  },
  {
    title: msg("Board"),
    uiOnly: false,
    features: [
      { key: "editCard", name: msg("Edit cards"), hides: msg("Edit in the card dialog, dragging cards"), blocks: msg("PUT …/card/{id}, PATCH …/card/{id}/status") },
      { key: "deleteCard", name: msg("Delete cards"), hides: msg("Delete in the card dialog"), blocks: msg("DELETE …/card/{id}") },
      { key: "editColumns", name: msg("Edit lists"), hides: msg("Rename/recolour in the list header, dragging list headers"), blocks: msg("PUT /board/{id}/column/{key}, PUT /board/{id}/column") },
      { key: "manageIssueTypes", name: msg("Manage issue types"), hides: msg("“Create Issue type”, delete on the Issue types page"), blocks: msg("POST, DELETE /board/{id}/issue-type") },
    ],
  },
  {
    title: msg("Navbar"),
    uiOnly: true,
    features: [
      { key: "backlogPage", name: msg("Backlog"), hides: msg("“Backlog” link, the Backlog choice in the card form; /backlog shows “turned off”"), blocks: msg("GET /board/{id}/card") },
      { key: "boardSwitcher", name: msg("Board switcher"), hides: msg("The board dropdown"), blocks: msg("The Board link; the board last chosen stays shown") },
      { key: "issueTypesPage", name: msg("Issue types page"), hides: msg("“Issue types” link; /issue-types shows “turned off”"), blocks: msg("Creating types from the card form (Manage issue types)") },
      { key: "boardBackground", name: msg("Board background"), hides: msg("“Board background” in the account menu"), blocks: msg("The saved background keeps applying") },
      { key: "navbarColour", name: msg("Navbar colour"), hides: msg("“Navbar colour” in the account menu"), blocks: msg("The saved colour keeps applying") },
    ],
  },
];
