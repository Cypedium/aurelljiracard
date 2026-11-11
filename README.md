# Aurell Jira Board

A small issue/feedback board. Logged-in users create cards (issue key, summary, priority 1–5, date), see everyone's cards on a drag-and-drop grid, and edit or delete their own. Each user's grid layout is saved server-side.

| Part | Stack | Folder | Fly app |
|---|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui | [`frontend/`](frontend) | `aurelljiraboard` |
| Backend (used by the frontend) | Java 25, Spring Boot 4, Spring Data JPA, PostgreSQL, Flyway | [`server-java/`](server-java) | `aurelljiraboardjava` |
| Database | PostgreSQL | — | external (`DB_URL`) |
| Backend (Node) | Node 22, Express 5, Mongoose 9 (CommonJS) | [`server/`](server) | `aurelljiraboard-backend` |
| Database (Node) | MongoDB | — | external (`MONGO_URI`) |

`server/` and `server-java/` implement the same API, so the frontend runs against either one; pick it with `NEXT_PUBLIC_API_URL`. The deployed frontend uses `server-java`. See [`server-java/README.md`](server-java/README.md) for the Spring Boot version.

## Getting started

Requires Node 22 and a MongoDB connection string.

```bash
# Backend (http://localhost:4000)
cd server
cp .env.example .env   # then fill in the values
npm ci
npm run dev

# Frontend (http://localhost:3000)
cd frontend
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
npm ci
npm run dev
```

### Environment variables

**`server/.env`** (never commit — use `fly secrets set` in production)

| Name | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for 15-minute access tokens |
| `REFRESH_SECRET` | Secret for 7-day refresh tokens (must differ from `JWT_SECRET`) |
| `PORT` | Port to listen on (`4000`) |
| `CLIENT_URL` | Comma-separated allowed CORS origins. Default: `http://localhost:3000,https://aurelljiraboard.fly.dev` |

**Frontend**

| Name | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL. Inlined at build time: `.env.local` for dev, `[build.args]` in `fly.app.toml` for production |

## Scripts

| Folder | Command | What it does |
|---|---|---|
| `server` | `npm run dev` / `npm start` | Start API with nodemon / node |
| `server` | `npm test` | Jest + Supertest API tests (models mocked, no DB needed) |
| `frontend` | `npm run dev` | Next dev server |
| `frontend` | `npm run build` | Production build (includes type check) |
| `frontend` | `npm test` | Jest unit tests |
| `server-java` | `./mvnw spring-boot:test-run` | Start the Spring Boot API on :8080 with a throwaway Postgres container (Docker) |
| `server-java` | `./mvnw test` | API tests against real Postgres via Testcontainers (Docker) |

`PythonTests/` holds manual smoke scripts that call a running API: `API_URL=http://localhost:4000 python PythonTests/backend/test_backend_prod.py`. They create real users and cards.

## API

[`docs/backend-map.html`](docs/backend-map.html) is an interactive map of `server-java`: open it in a browser and click an endpoint to see its path through security, controller, service, repository and table.

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`. An expired or invalid access token returns `401`; the frontend then calls `/auth/refresh` automatically.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | `{ username, password, pictureUrl? }` → `201`. Password 8–72 characters, no character three times in a row and at least 4 different characters; usernames with rude words → `400`. `409 "Username already taken."` also when the name differs only in case (`mike` vs `Mike`) |
| `POST` | `/auth/login` | `{ username, password }` → `{ accessToken, refreshToken }`. The username is matched case-insensitively (exact match first); the token carries the stored name |
| `POST` | `/auth/refresh` | `{ refreshToken }` → new `{ accessToken, refreshToken }`. Each refresh token works once; sending a used one again revokes that login (`403`), other logins keep working |
| `POST` | `/auth/logout` | `{ refreshToken }` → revokes all of the user's refresh tokens |
| `GET` | `/board` | Your boards: `[{ _id, name, owner, role }]`, your own board first (`role: "admin"`), then the ones you collaborate on (`role: "user"`). Every user owns exactly one board |
| `POST` | `/board/:boardId/invite` | **Board admin.** A new invite link token → `201 { token }`; the link is `<frontend>/invite/<token>`. Only a hash is stored, so the token is shown only here; a new one turns off the old one |
| `DELETE` | `/board/:boardId/invite` | **Board admin.** Turns the invite link off; collaborators who joined stay |
| `POST` | `/invite/:token` | Joins the board behind the link as a collaborator → the board. Joining again, or your own board, changes nothing; `404` for an unknown or turned-off link |
| `GET` | `/board/:boardId/member` | The board's members `[{ _id (user id), username, pictureUrl, role }]`, the owner first |
| `DELETE` | `/board/:boardId/member/:userId` | **Board admin** removes a collaborator; with your own id a collaborator leaves. `400` if the owner tries to leave |
| `GET` | `/board/:boardId/card` | The board's cards, newest first |
| `POST` | `/board/:boardId/card` | `{ rating (1–5), comment, productId, type?, status? }` → `201`; `type` is one of the board's issue types (default `task`); `status: "backlog"` creates an unassigned backlog card, otherwise the author is the assignee; `productId` (issue key) must look like `MA-100` (letters, hyphen, digits; max 6 characters), `409` if it already exists on the board. Author is taken from the token |
| `PUT` | `/board/:boardId/card/:id` | Edit a card, same body as `POST` → updated card; `403` unless it is your own or you are the board admin, `409` if another card on the board has the issue key |
| `PATCH` | `/board/:boardId/card/:id/status` | `{ status }` (one of the board's list keys, or `backlog`) → updated card. Any member can move any card; taking a card from the backlog assigns it to the caller, moving it to `backlog` unassigns it |
| `DELETE` | `/board/:boardId/card/:id` | Delete a card; `403` unless it is your own or you are the board admin |
| `GET` | `/board/:boardId/column` | The board's lists in board order: `[{ key, title, color, position }]` (`color` `null` = default colour). A new board starts with `todo`, `in-progress`, `test`, `done`; `todo` always exists |
| `POST` | `/board/:boardId/column` | **Board admin.** `{ title, color? }` → `201` new list at the end; its `key` is made from the title (`"Code review"` → `code-review`, unique on the board). At most 12 lists |
| `PUT` | `/board/:boardId/column` | **Board admin.** `{ keys }` — every list key exactly once, in the new order → the lists in that order; cards follow their list. `400` if a list is missing, unknown or repeated |
| `PUT` | `/board/:boardId/column/:key` | **Board admin.** `{ title, color }` → updated list (`color` omitted or `null` = default colour). `404` for an unknown key |
| `DELETE` | `/board/:boardId/column/:key` | **Board admin.** Deletes an empty list → `200 { message }`; `409` while any card has that status, `400` for the default list `todo` or a malformed key, `404` if unknown |
| `GET` | `/board/:boardId/issue-type` | The board's issue types in dropdown order: `[{ key, label, color, icon, position }]`. A new board starts with `task`, `bug`, `doc` |
| `POST` | `/board/:boardId/issue-type` | **Board admin.** `{ label (≤ 30), color (#rrggbb), icon }` → `201` new issue type at the end; `icon` is one of `check`, `bug`, `doc`, `bolt`, `star`, `flag`, `wrench`, `light-bulb`; its `key` is made from the label (`"User story"` → `user-story`, unique on the board). At most 12 types |
| `DELETE` | `/board/:boardId/issue-type/:key` | **Board admin.** Deletes an issue type → `200 { message }`; `409` while cards on the board use it, `400` for the default type `task`, `404` if unknown |
| `GET` | `/user` | Users (`_id`, `username`, `pictureUrl`, `role`) |
| `GET` | `/user/usernames` | Usernames only |
| `GET` | `/user/layout` | Current user's board layout (the frontend only reads `cards`: the order of cards within each list) |
| `PUT` | `/user/layout` | `{ cols?, headers?, cards? }` — merge and save layout. `headers` is legacy (list names and colours live on the board's `/column` now); each header is `{ key, title, color? }`. Each card position is `{ id, x, y, w, h, status? }`; `status` is the list key, so card order survives lists being moved. One layout covers all your boards (positions are keyed by card id) |
| `PATCH` | `/user/:id` | **Admin.** `{ username?, role? }` → updated user. Either change revokes the user's refresh tokens; their cards follow a rename. `409` if the name is taken in any casing (changing only the casing of their own name is allowed), `400` for rude words or if you remove your own admin role |
| `DELETE` | `/user/:id` | **Admin.** Delete a user; `409` while they still author cards or their own board has cards, `400` for yourself. Cards assigned to them become unassigned; their board and memberships are removed |
| `POST` | `/user/:id/logout` | **Admin.** Revoke all the user's refresh tokens (logged out within 15 min) |
| `GET` | `/health` | `{ status: "ok" }` |

Errors are returned as `{ message }`. Everything under `/board/:boardId` answers `404 "Board not found."` when you are not a member (so board ids don't reveal a board), and `403 "Board admins only."` when a collaborator tries a board admin action.

### Boards and roles

Every user owns one board and is its **board admin**: they add, rename, move and delete its lists, manage its issue types on the **Issue types** page (`/issue-types`), edit and delete any card on it, and invite collaborators with **Share** in the navbar (a link `/invite/<token>`). Whoever opens the link and logs in joins as a **collaborator** (board role `user`): they see the board, add cards, move any card and edit or delete their own. The navbar's board switcher picks which board is shown (remembered per browser). Board roles are checked on every request, so removing a collaborator takes effect at once.

Separately, every user has a global `role`: `user` (default) or `admin`. The global admin manages users (rename, change role, delete, log out) on the **Users** page (`/users`, shown in the navbar for admins only); it gives no rights on other people's boards. The role is sent as a `role` claim in the access token, so a change takes effect at the next login or token refresh (max 15 min). The first admin has to be set in the database:

```sql
-- server-java (PostgreSQL)
UPDATE users SET role = 'admin' WHERE username = '<name>';
```

```js
// server (MongoDB, mongosh)
db.users.updateOne({ username: "<name>" }, { $set: { role: "admin" } })
```

## Deployment

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs the `server` tests, the `server-java` tests (Testcontainers on the runner's Docker) and the frontend type check, tests and build on every PR and push to `main`. Pushes to `main` then deploy both apps to Fly.io (requires the `FLY_API_TOKEN` repository secret).

Manual deploy: `fly deploy -c fly.server.toml` in `server/`, `fly deploy -c fly.app.toml` in `frontend/` (or the `deploy-*.bat` scripts).

Backend secrets must be set on Fly once:

```bash
fly secrets set -a aurelljiraboard-backend MONGO_URI=... JWT_SECRET=... REFRESH_SECRET=... CLIENT_URL=https://aurelljiraboard.fly.dev
```

CI tests `server-java` but does not deploy it; deploy it by hand with `fly deploy -c fly.java.toml` in `server-java/` (see [`server-java/README.md`](server-java/README.md#deployment-flyio)).

### Moving to per-user boards

The board API (`/board/:boardId/...`) replaced the global `/card`, `/column` and `/issue-type` routes, so the backends must be migrated before the new frontend reaches users:

1. **`server-java`** — `fly deploy -c fly.java.toml`. Flyway runs `V11__boards.sql` on start: every user gets a board, and all existing cards, lists and issue types move to the oldest admin's board (the oldest user's if there is no admin), with every other user added to it as a collaborator. The old frontend stops working against it from that moment, so merge right after.
2. **`server/`** — before the new version starts, run `node scripts/migrateBoards.js` in `server/` with the production `MONGO_URI` (same result as V11; safe to run twice). It also drops the old global unique indexes, which would otherwise block new boards.
