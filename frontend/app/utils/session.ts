// Inloggningen sparas i localStorage; se även clearSession i logout.ts

// Minst en token finns → axios-interceptorn avgör resten
export const hasSession = (): boolean =>
  Boolean(localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"));

export const getUsername = (): string => localStorage.getItem("username") || "";

// Samma roller som backend (server/utils/role.js)
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Rollen läses ur access-tokenets payload (bara för UI:t; backend kontrollerar själv).
// Saknas eller ogiltig → "user"
export const getRole = (): Role => {
  try {
    const payload = (localStorage.getItem("accessToken") || "").split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const role = JSON.parse(json).role;
    return ROLES.includes(role) ? role : "user";
  } catch {
    return "user";
  }
};

export const isAdmin = (): boolean => getRole() === "admin";

export const saveSession = (username: string, accessToken: string, refreshToken: string) => {
  localStorage.setItem("username", username);
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

// Samma regler som backend: bara författaren redigerar; författaren eller admin tar bort.
// Kort utan _id (inte sparade) kan inte ändras
type OwnedCard = { _id?: string; username: string };

export const canEditCard = (card: OwnedCard, username: string): boolean =>
  Boolean(card._id) && card.username === username;

export const canDeleteCard = (card: OwnedCard, username: string, admin: boolean): boolean =>
  Boolean(card._id) && (card.username === username || admin);
