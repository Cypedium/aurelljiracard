# Aurell Jira Board

A small issue/feedback board. Logged-in users create cards (issue key, summary, priority 1–5, date), see everyone's cards on a drag-and-drop grid, and edit or delete their own. Each user's grid layout is saved server-side.

| Part | Stack | Folder | Fly app |
|---|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui | [`frontend/`](frontend) | `aurelljiraboard` |
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

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`. An expired or invalid access token returns `401`; the frontend then calls `/auth/refresh` automatically.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | `{ username, password, pictureUrl? }` → `201` |
| `POST` | `/auth/login` | `{ username, password }` → `{ accessToken, refreshToken }` |
| `POST` | `/auth/refresh` | `{ refreshToken }` → new `{ accessToken, refreshToken }` |
| `POST` | `/auth/logout` | `{ refreshToken }` → revokes all of the user's refresh tokens |
| `GET` | `/card` | All cards, newest first |
| `POST` | `/card` | `{ rating (1–5), comment, productId, submittedAt? }` → `201`; `409` if the `productId` (issue key) already exists. Author is taken from the token |
| `PUT` | `/card/:id` | Edit a card, same body as `POST` → updated card; `403` unless it is your own, `409` if another card has the issue key |
| `PATCH` | `/card/:id/status` | `{ status }` (`todo`, `in-progress`, `test`, `done`) → updated card. Any logged-in user can move any card |
| `DELETE` | `/card/:id` | Delete a card; `403` unless it is your own or you are an admin |
| `GET` | `/user` | Users (`username`, `pictureUrl`) |
| `GET` | `/user/usernames` | Usernames only |
| `GET` | `/user/layout` | Current user's board layout |
| `PUT` | `/user/layout` | `{ cols?, headers?, cards? }` — merge and save layout. Each header is `{ key, title, color? }`; `color` is an optional `#rrggbb` list colour (omit or `null` for the default) |
| `GET` | `/health` | `{ status: "ok" }` |

Errors are returned as `{ message }`.

### Roles

Every user has a `role`: `user` (default) or `admin`. Admins can delete any card; editing is still author-only. The role is sent as a `role` claim in the access token, so a change takes effect at the next login or token refresh (max 15 min). There is no endpoint for roles — set them in the database:

```sql
-- server-java (PostgreSQL)
UPDATE users SET role = 'admin' WHERE username = '<name>';
```

```js
// server (MongoDB, mongosh)
db.users.updateOne({ username: "<name>" }, { $set: { role: "admin" } })
```

## Deployment

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs server tests and the frontend type check, tests and build on every PR and push to `main`. Pushes to `main` then deploy both apps to Fly.io (requires the `FLY_API_TOKEN` repository secret).

Manual deploy: `fly deploy -c fly.server.toml` in `server/`, `fly deploy -c fly.app.toml` in `frontend/` (or the `deploy-*.bat` scripts).

Backend secrets must be set on Fly once:

```bash
fly secrets set -a aurelljiraboard-backend MONGO_URI=... JWT_SECRET=... REFRESH_SECRET=... CLIENT_URL=https://aurelljiraboard.fly.dev
```

`server-java` is not deployed by CI; deploy it by hand with `fly deploy -c fly.java.toml` in `server-java/` (see [`server-java/README.md`](server-java/README.md#deployment-flyio)).
