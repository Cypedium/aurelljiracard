# Aurell Jira Board API — Spring Boot + PostgreSQL

A second implementation of the board API, next to the Express + MongoDB one in [`../server`](../server). It exposes the **same endpoints, JSON shapes, status codes and token rules**, so the Next.js frontend works against either backend by changing `NEXT_PUBLIC_API_URL`.

How the code is organised (request flow, security, data model, with diagrams): [ARCHITECTURE.md](ARCHITECTURE.md).

| | |
|---|---|
| Language | Java 25 |
| Framework | Spring Boot 4.1 (Spring MVC, Spring Data JPA, Spring Security) |
| Database | PostgreSQL, schema managed by Flyway |
| Auth | HS256 JWTs via Spring Security's OAuth2 resource server (Nimbus), BCrypt passwords |
| Tests | JUnit 5, MockMvc, Testcontainers (real Postgres) |
| Build | Maven (wrapper included) |

## Architecture

Classic layered Spring application:

```
src/main/java/se/aurell/jiraboard/
  controller/   REST endpoints (/auth, /board/{boardId}/card|column|issue-type, /board, /invite, /user, /health)
  service/      business rules, board membership (BoardService), ownership checks, @Transactional
  repository/   Spring Data JPA interfaces
  entity/       JPA entities (User, Board, BoardMember, Card, BoardColumn, IssueType), enums, the JSONB Layout record
  dto/          request/response records with Bean Validation
  security/     JwtService, Bearer token handling, 401 { message } responses
  config/       SecurityConfig, CORS and JWT properties
  exception/    ApiException + GlobalExceptionHandler → { message }
src/main/resources/db/migration/   Flyway SQL migrations
```

### MongoDB → PostgreSQL

| MongoDB (Express) | PostgreSQL (this API) |
|---|---|
| `ObjectId` `_id` | `UUID` primary key, still serialised as `_id` |
| `User` document | `users` table, `username` UNIQUE |
| embedded `User.layout` | `layout JSONB` column |
| `Card` document | `cards` table with a `CHECK` constraint on `rating`, FK `username → users` |
| `Column` document | `board_columns` table (`V6__board_columns.sql` seeds the four default lists) |
| `IssueType` document | `issue_types` table (`V8__issue_types.sql` seeds `task`, `bug`, `doc`) |
| `Board`, `BoardMember` documents | `boards` and `board_members` tables (`V11__boards.sql`); cards, lists and issue types get a `board_id` and per-board unique keys. Mongo seeds a board's lists and types on first read, Postgres when the board is created |
| `$inc` on `tokenVersion` | atomic `UPDATE … SET token_version = token_version + 1` |

## Running locally

Requires JDK 25 and Docker.

**Easiest: throwaway database.** Starts Postgres in a container and the API on http://localhost:8080 with dev-only JWT secrets:

```bash
./mvnw spring-boot:test-run
```

**Persistent database in Docker:** [`docker-compose.yml`](docker-compose.yml) runs `postgres:17-alpine` on port 5432 with a named volume (user/password default to `jiraboard`):

```bash
docker compose up -d --wait   # start (data survives restarts)
docker compose down           # stop; add -v to wipe the data
```

Then set `DB_URL=jdbc:postgresql://localhost:5432/jiraboard`, `DB_USERNAME=jiraboard`, `DB_PASSWORD=jiraboard` plus the JWT secrets and run the API as below.

**Against your own Postgres:** set the environment variables below, then:

```bash
./mvnw spring-boot:run
```

Point the frontend at it with `NEXT_PUBLIC_API_URL=http://localhost:8080` in `frontend/.env.local`.

### Environment variables

See [`.env.example`](.env.example). Spring does not read `.env` files; export the variables in your shell or IDE run config.

| Name | Description |
|---|---|
| `DB_URL` | JDBC URL. Default `jdbc:postgresql://localhost:5432/jiraboard` |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials |
| `JWT_SECRET` | Access token secret, at least 32 bytes |
| `REFRESH_SECRET` | Refresh token secret, at least 32 bytes, different from `JWT_SECRET` |
| `PORT` | Default `8080` |
| `CLIENT_URL` | Comma-separated CORS origins. Default `http://localhost:3000,https://aurelljiraboard.fly.dev` |
| `GOOGLE_CLIENT_ID` | Optional. OAuth client id for Sign in with Google (same as the frontend's `NEXT_PUBLIC_GOOGLE_CLIENT_ID`). Empty = `/auth/google` and `/user/google` answer `503` |

The app refuses to start if a JWT secret is missing or too short.

## Deployment (Fly.io)

Fly app `aurelljiraboardjava` (region `arn`), built from [`Dockerfile.java`](Dockerfile.java) with [`fly.java.toml`](fly.java.toml). The database is an external PostgreSQL (e.g. Neon or Supabase free tier). Flyway creates the tables on first start.

One-time setup, from `server-java/`:

```bash
fly apps create aurelljiraboardjava
# Pick your own values; never commit them. Hosted Postgres needs SSL:
#   DB_URL=jdbc:postgresql://<host>:5432/<db>?sslmode=require
fly secrets set -a aurelljiraboardjava DB_URL=... DB_USERNAME=... DB_PASSWORD=... \
  JWT_SECRET=... REFRESH_SECRET=... CLIENT_URL=https://aurelljiraboard.fly.dev
# Optional, for Sign in with Google (not a secret, but set here with the rest)
fly secrets set -a aurelljiraboardjava GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
```

Deploy (not done by CI yet):

```bash
fly deploy -c fly.java.toml
```

Tests are skipped in the Docker build (they need Docker); run `./mvnw test` before deploying. Machines stop when idle, so the first request after a pause waits for the JVM to start (~15–20 s).

## Tests

```bash
./mvnw test
```

Docker must be running: the API tests start a real PostgreSQL container, run the Flyway migrations and call every endpoint through the full security filter chain.

## API

Same as the Express API; see the [root README](../README.md#api). Differences that a client can notice:

- Ids are UUIDs instead of 24-character ObjectIds.
- A body that is not valid JSON, or has a field of the wrong type, returns `400 { "message": "Invalid request body." }`.
- Sign in with Google exists only here, not in the Express API:
  - `POST /auth/google { credential }` (public) verifies Google's ID token and returns `{ accessToken, refreshToken }`. The first sign-in creates a user named after the email address (`mikael.aurell@gmail.com` → `mikael.aurell`, `mikael.aurell2` if taken) without a password.
  - `POST /user/google { credential }` (logged in) connects a Google account to the caller. `409` if it belongs to another user or the caller already has a different one.
  - `401 "Invalid Google credential."`, `503 "Google sign-in is not configured."` when `GOOGLE_CLIENT_ID` is not set.
