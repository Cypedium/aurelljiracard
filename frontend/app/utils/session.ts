import { msg } from "./i18n";

// The login is kept in sessionStorage: it survives a reload but disappears
// when the window/tab is closed (= logged out). Read and write only through the functions here
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USERNAME_KEY = "username";
export const SESSION_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USERNAME_KEY] as const;

// Login, refreshed tokens and logout notify the subscribers (useSession)
const sessionListeners = new Set<() => void>();
const notifySession = () => sessionListeners.forEach((listener) => listener());

export const onSessionChange = (listener: () => void): (() => void) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

// Older versions kept the login in localStorage; remove it
export const clearLegacySession = () => SESSION_KEYS.forEach((k) => localStorage.removeItem(k));

// Logout, or when the tokens can no longer be refreshed
export const clearSession = () => {
  SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
  clearLegacySession();
  notifySession();
};

export const getAccessToken = (): string | null => sessionStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = (): string | null => sessionStorage.getItem(REFRESH_TOKEN_KEY);

// After /auth/refresh: both tokens are replaced (refresh tokens are single-use). The role may have changed
export const saveTokens = (accessToken: string, refreshToken: string) => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifySession();
};

// At least one token exists → the axios interceptor decides the rest
export const hasSession = (): boolean => Boolean(getAccessToken() || getRefreshToken());

export const getUsername = (): string => sessionStorage.getItem(USERNAME_KEY) || "";

// The same roles as the backend (server-java Role)
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];
// The roles' names in the UI (shown translated)
export const ROLE_LABELS: Record<Role, string> = { user: msg("User"), admin: msg("Admin") };

// The access token's payload (UI only; the backend checks for itself). Invalid → {}
const tokenPayload = (accessToken: string): Record<string, unknown> => {
  try {
    const payload = accessToken.split(".")[1];
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
    );
    return JSON.parse(json) ?? {};
  } catch {
    return {};
  }
};

// The role is read from the access token. Missing or invalid → "user"
export const getRole = (): Role => {
  const role = tokenPayload(getAccessToken() || "").role;
  return ROLES.includes(role as Role) ? (role as Role) : "user";
};

// The name as stored ("Mike"), even if you logged in as "mike"
export const tokenUsername = (accessToken: string): string | null => {
  const username = tokenPayload(accessToken).username;
  return typeof username === "string" && username ? username : null;
};

export const isAdmin = (): boolean => getRole() === "admin";

export const saveSession = (username: string, accessToken: string, refreshToken: string) => {
  sessionStorage.setItem(USERNAME_KEY, username);
  saveTokens(accessToken, refreshToken);
  clearLegacySession();
};

// What the UI needs to know about the login. The same object as long as nothing changed (required by useSyncExternalStore)
export type SessionSnapshot = { loggedIn: boolean; username: string; admin: boolean };
export const SIGNED_OUT: SessionSnapshot = { loggedIn: false, username: "", admin: false };

let lastSnapshot: SessionSnapshot = SIGNED_OUT;

export const sessionSnapshot = (): SessionSnapshot => {
  const next = { loggedIn: hasSession(), username: getUsername(), admin: isAdmin() };
  const prev = lastSnapshot;
  if (next.loggedIn !== prev.loggedIn || next.username !== prev.username || next.admin !== prev.admin) {
    lastSnapshot = next;
  }
  return lastSnapshot;
};

// The same rules as the backend: everyone on the board edits every card (collaborators too);
// only the author or the board's admin deletes. Cards without an _id (not saved) can't be changed
type OwnedCard = { _id?: string; username: string };

export const canEditCard = (card: OwnedCard): boolean => Boolean(card._id);

export const canDeleteCard = (card: OwnedCard, username: string, admin: boolean): boolean =>
  Boolean(card._id) && (card.username === username || admin);
