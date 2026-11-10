// app/api/endpoints.ts
// Paths must match the backend mounts in server/app.js: /auth, /card, /column, /issue-type, /user
import api from "./api";
import type { CardStatus, UserLayout } from "../utils/boardLayout";
import type { CardType, IssueType, IssueTypeIconName } from "../utils/cardType";
import type { AnyCardStatus } from "../utils/backlog";
import type { Role } from "../utils/session";

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
  _id: string;
  username: string;
  pictureUrl?: string;
  role: Role;
  // Bara för admins: senast inloggad/förnyad token (ISO) och om användaren är inloggad nu
  lastActiveAt?: string | null;
  online?: boolean;
};

// A board list as the backend returns it; color null = the default colour
export type BoardColumn = { key: CardStatus; title: string; color?: string | null; position: number };
// Admin: title and colour of a list, both replaced (color null = the default colour)
export type ColumnChanges = { title: string; color?: string | null };

// Admin: a new issue type; the backend makes its key from the label
export type NewIssueType = { label: string; color: string; icon: IssueTypeIconName };

// Admin: fields left out keep their value
export type UserChanges = { username?: string; role?: Role };

// ⭐ AUTH
export const registerUser = (user: User) => api.post("/auth/register", user);

export const loginUser = (credentials: Credentials) =>
  api.post<Tokens>("/auth/login", credentials);

// Sign in with Google: credential = the ID token from Google's button; the first sign-in creates the user
export const googleLogin = (credential: string) =>
  api.post<Tokens>("/auth/google", { credential });

export const logoutUser = (refreshToken: string) =>
  api.post("/auth/logout", { refreshToken });

export const refreshToken = (refreshToken: string) =>
  api.post("/auth/refresh", { refreshToken });

// ⭐ CARDS
export const submitCard = (card: NewCard) =>
  api.post("/card", card);

export const getCards = () => api.get<Card[]>("/card");

// The author or an admin may edit a card; the backend returns the updated card
export const updateCard = (id: string, card: NewCard) =>
  api.put<Card>(`/card/${id}`, card);

// Any logged-in user may move a card to another column; taking one from the backlog assigns it to you
export const updateCardStatus = (id: string, status: AnyCardStatus) =>
  api.patch<Card>(`/card/${id}/status`, { status });

export const deleteCard = (id: string) =>
  api.delete(`/card/${id}`);

// ⭐ COLUMNS (lists, shared by all users)
export const getColumns = () => api.get<BoardColumn[]>("/column");

// Admin: adds a list at the end of the board; the backend makes its key from the title
export const createColumn = (changes: ColumnChanges) => api.post<BoardColumn>("/column", changes);

// Admin: renames and/or recolours a list for everyone
// Admin: listornas ordning för alla; keys = alla listor, i den nya ordningen
export const reorderColumns = (keys: CardStatus[]) => api.put<BoardColumn[]>("/column", { keys });

export const updateColumn = (key: CardStatus, changes: ColumnChanges) =>
  api.put<BoardColumn>(`/column/${encodeURIComponent(key)}`, changes);

// Admin: only empty lists can be deleted (409 otherwise); the default list (todo) stays
export const deleteColumn = (key: CardStatus) => api.delete(`/column/${encodeURIComponent(key)}`);

// ⭐ ISSUE TYPES (shared by all users)
export const getIssueTypes = () => api.get<IssueType[]>("/issue-type");

// Admin: adds an issue type at the end of the dropdown
export const createIssueType = (type: NewIssueType) => api.post<IssueType>("/issue-type", type);

// Admin: only issue types that no card uses can be deleted (409 otherwise); the default type (task) stays
export const deleteIssueType = (key: CardType) => api.delete(`/issue-type/${encodeURIComponent(key)}`);

// ⭐ USERS
export const getUsers = () => api.get<PublicUser[]>("/user");

// The logged-in user's board layout (card order within the lists)
export const getLayout = () => api.get<Partial<UserLayout>>("/user/layout");

export const saveLayout = (layout: UserLayout) => api.put("/user/layout", layout);

// Connects a Google account to the logged-in user (409 if it belongs to someone else)
export const connectGoogle = (credential: string) => api.post("/user/google", { credential });

// ⭐ ADMIN (the backend returns 403 for other users)
// Renaming or changing the role logs the user out; their cards follow the new name
export const updateUser = (id: string, changes: UserChanges) => api.patch<PublicUser>(`/user/${id}`, changes);

// Only users without cards can be deleted (409 otherwise)
export const deleteUser = (id: string) => api.delete(`/user/${id}`);

// Revokes all the user's refresh tokens
export const revokeUserSessions = (id: string) => api.post(`/user/${id}/logout`);

export default {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  refreshToken,
  submitCard,
  getCards,
  updateCard,
  updateCardStatus,
  getUsers,
  getLayout,
  saveLayout,
  connectGoogle,
  deleteCard,
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  getIssueTypes,
  createIssueType,
  deleteIssueType,
  updateUser,
  deleteUser,
  revokeUserSessions,
};
