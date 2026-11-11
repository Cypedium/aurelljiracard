// app/api/endpoints.ts
// Paths must match the backend mounts in server/app.js: /auth, /board, /invite, /user.
// Cards, lists and issue types belong to a board: /board/:boardId/card|column|issue-type
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

// A board the user owns (role "admin") or collaborates on (role "user"); name = "<owner>'s board"
export type Board = { _id: string; name: string; owner: string; role: Role };

// A member of a board; _id is the user's id
export type BoardMember = { _id: string; username: string; pictureUrl?: string; role: Role };

const onBoard = (boardId: string, path: string) => `/board/${encodeURIComponent(boardId)}${path}`;

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

// ⭐ BOARDS (the backend creates the user's own board on the first call)
export const getBoards = () => api.get<Board[]>("/board");

// Board admin: a new invite link (the old one stops working); the token is only shown here
export const createInvite = (boardId: string) => api.post<{ token: string }>(onBoard(boardId, "/invite"));

// Board admin: turns the invite link off; collaborators who joined stay
export const deleteInvite = (boardId: string) => api.delete(onBoard(boardId, "/invite"));

// Joins the board behind an invite link as a collaborator; returns the board
export const joinBoard = (token: string) => api.post<Board>(`/invite/${encodeURIComponent(token)}`);

export const getMembers = (boardId: string) => api.get<BoardMember[]>(onBoard(boardId, "/member"));

// Board admin: removes a collaborator. With your own id: leave the board
export const removeMember = (boardId: string, userId: string) =>
  api.delete(onBoard(boardId, `/member/${encodeURIComponent(userId)}`));

// ⭐ CARDS (on one board; members only)
export const submitCard = (boardId: string, card: NewCard) =>
  api.post(onBoard(boardId, "/card"), card);

export const getCards = (boardId: string) => api.get<Card[]>(onBoard(boardId, "/card"));

// The author or the board admin may edit a card; the backend returns the updated card
export const updateCard = (boardId: string, id: string, card: NewCard) =>
  api.put<Card>(onBoard(boardId, `/card/${id}`), card);

// Any member may move a card to another column; taking one from the backlog assigns it to you
export const updateCardStatus = (boardId: string, id: string, status: AnyCardStatus) =>
  api.patch<Card>(onBoard(boardId, `/card/${id}/status`), { status });

export const deleteCard = (boardId: string, id: string) =>
  api.delete(onBoard(boardId, `/card/${id}`));

// ⭐ COLUMNS (the board's lists; members read them, the board admin changes them)
export const getColumns = (boardId: string) => api.get<BoardColumn[]>(onBoard(boardId, "/column"));

// Board admin: adds a list at the end of the board; the backend makes its key from the title
export const createColumn = (boardId: string, changes: ColumnChanges) =>
  api.post<BoardColumn>(onBoard(boardId, "/column"), changes);

// Board admin: listornas ordning; keys = alla listor, i den nya ordningen
export const reorderColumns = (boardId: string, keys: CardStatus[]) =>
  api.put<BoardColumn[]>(onBoard(boardId, "/column"), { keys });

// Board admin: renames and/or recolours a list
export const updateColumn = (boardId: string, key: CardStatus, changes: ColumnChanges) =>
  api.put<BoardColumn>(onBoard(boardId, `/column/${encodeURIComponent(key)}`), changes);

// Board admin: only empty lists can be deleted (409 otherwise); the default list (todo) stays
export const deleteColumn = (boardId: string, key: CardStatus) =>
  api.delete(onBoard(boardId, `/column/${encodeURIComponent(key)}`));

// ⭐ ISSUE TYPES (the board's; members read them, the board admin changes them)
export const getIssueTypes = (boardId: string) => api.get<IssueType[]>(onBoard(boardId, "/issue-type"));

// Board admin: adds an issue type at the end of the dropdown
export const createIssueType = (boardId: string, type: NewIssueType) =>
  api.post<IssueType>(onBoard(boardId, "/issue-type"), type);

// Board admin: only issue types that no card uses can be deleted (409 otherwise); the default type (task) stays
export const deleteIssueType = (boardId: string, key: CardType) =>
  api.delete(onBoard(boardId, `/issue-type/${encodeURIComponent(key)}`));

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
  getBoards,
  createInvite,
  deleteInvite,
  joinBoard,
  getMembers,
  removeMember,
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
