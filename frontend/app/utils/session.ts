// Inloggningen sparas i sessionStorage: den finns kvar vid omladdning men försvinner
// när fönstret/fliken stängs (= utloggad). Se även clearSession i logout.ts
export const SESSION_KEYS = ["accessToken", "refreshToken", "username"] as const;

// Äldre versioner sparade inloggningen i localStorage; ta bort den
export const clearLegacySession = () => SESSION_KEYS.forEach((k) => localStorage.removeItem(k));

// Minst en token finns → axios-interceptorn avgör resten
export const hasSession = (): boolean =>
  Boolean(sessionStorage.getItem("accessToken") || sessionStorage.getItem("refreshToken"));

export const getUsername = (): string => sessionStorage.getItem("username") || "";

// Samma roller som backend (server/utils/role.js)
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Access-tokenets payload (bara för UI:t; backend kontrollerar själv). Ogiltig → {}
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

// Rollen läses ur access-tokenet. Saknas eller ogiltig → "user"
export const getRole = (): Role => {
  const role = tokenPayload(sessionStorage.getItem("accessToken") || "").role;
  return ROLES.includes(role as Role) ? (role as Role) : "user";
};

// Namnet som det är sparat ("Mike"), även om man loggade in som "mike"
export const tokenUsername = (accessToken: string): string | null => {
  const username = tokenPayload(accessToken).username;
  return typeof username === "string" && username ? username : null;
};

export const isAdmin = (): boolean => getRole() === "admin";

export const saveSession = (username: string, accessToken: string, refreshToken: string) => {
  sessionStorage.setItem("username", username);
  sessionStorage.setItem("accessToken", accessToken);
  sessionStorage.setItem("refreshToken", refreshToken);
  clearLegacySession();
};

// Samma regler som backend: bara författaren redigerar; författaren eller admin tar bort.
// Kort utan _id (inte sparade) kan inte ändras
type OwnedCard = { _id?: string; username: string };

export const canEditCard = (card: OwnedCard, username: string, admin: boolean): boolean =>
  Boolean(card._id) && (card.username === username || admin);

export const canDeleteCard = (card: OwnedCard, username: string, admin: boolean): boolean =>
  Boolean(card._id) && (card.username === username || admin);
