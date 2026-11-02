// app/api/endpoints.ts
// Paths must match the backend mounts in server/app.js: /auth, /card, /user
import api from "./api";
import type { UserLayout } from "../utils/boardLayout";
import type { CardType } from "../utils/cardType";
import type { AnyCardStatus } from "../utils/backlog";

export type Card = {
  _id?: string;
  rating: number;
  comment: string;
  productId: string;
  username: string;
  // Who works on the card; null in the backlog, missing on older cards (→ the author)
  assignee?: string | null;
  submittedAt: string;
  // Missing on cards created before statuses existed → treated as "todo"
  status?: AnyCardStatus;
  // Missing on cards created before types existed → treated as "task"
  type?: CardType;
};

// The backend sets the author from the access token and the date to today;
// new cards start in "todo" unless a status (board column or "backlog") is given
export type NewCard = Omit<Card, "_id" | "username" | "assignee" | "submittedAt">;

export type User = {
  username: string;
  password: string;
  pictureUrl?: string;
};

export type Credentials = {
  username: string;
  password: string;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type PublicUser = {
  username: string;
  pictureUrl?: string;
};

// ⭐ AUTH
export const registerUser = (user: User) => api.post("/auth/register", user);

export const loginUser = (credentials: Credentials) =>
  api.post<Tokens>("/auth/login", credentials);

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

// Any logged-in user may move a card to another column; taking one from the backlog assigns it to you
export const updateCardStatus = (id: string, status: AnyCardStatus) =>
  api.patch<Card>(`/card/${id}/status`, { status });

export const deleteCard = (id: string) =>
  api.delete(`/card/${id}`);

// ⭐ USERS
export const getUsers = () => api.get<PublicUser[]>("/user");

// The logged-in user's board layout (column names/colours and card order)
export const getLayout = () => api.get<Partial<UserLayout>>("/user/layout");

export const saveLayout = (layout: UserLayout) => api.put("/user/layout", layout);

export default {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  submitCard,
  getCards,
  updateCard,
  updateCardStatus,
  getUsers,
  getLayout,
  saveLayout,
  deleteCard,
};
