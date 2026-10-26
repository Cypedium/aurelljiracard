// app/api/endpoints.ts
// Paths must match the backend mounts in server/app.js: /auth, /card, /user
import api from "./api";
import type { CardStatus } from "../utils/boardLayout";

export type Card = {
  _id?: string;
  rating: number;
  comment: string;
  productId: string;
  username: string;
  submittedAt: string;
  // Missing on cards created before statuses existed → treated as "todo"
  status?: CardStatus;
};

// The backend sets the author from the access token; new cards start in "todo"
// unless a status (board column) is given
export type NewCard = Omit<Card, "_id" | "username">;

export type User = {
  username: string;
  password: string;
  pictureUrl?: string;
};

export type PublicUser = {
  username: string;
  pictureUrl?: string;
};

// ⭐ AUTH
export const registerUser = (user: User) => api.post("/auth/register", user);

export const logoutUser = (refreshToken: string) =>
  api.post("/auth/logout", { refreshToken });

export const refreshToken = (refreshToken: string) =>
  api.post("/auth/refresh", { refreshToken });

// ⭐ CARDS
export const submitCard = (card: NewCard) =>
  api.post("/card", card);

export const getCards = () => api.get<Card[]>("/card");

// Only the card's author may edit it; the backend returns the updated card
export const updateCard = (id: string, card: NewCard) =>
  api.put<Card>(`/card/${id}`, card);

// Any logged-in user may move a card to another column
export const updateCardStatus = (id: string, status: CardStatus) =>
  api.patch<Card>(`/card/${id}/status`, { status });

export const deleteCard = (id: string) =>
  api.delete(`/card/${id}`);

// ⭐ USERS
export const getUsers = () => api.get<PublicUser[]>("/user");

export default {
  registerUser,
  logoutUser,
  refreshToken,
  submitCard,
  getCards,
  updateCard,
  updateCardStatus,
  getUsers,
  deleteCard,
};
