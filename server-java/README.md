# Aurell Jira Board API — Spring Boot + PostgreSQL

A second implementation of the board API, next to the Express + MongoDB one in [`../server`](../server). It exposes the **same endpoints, JSON shapes, status codes and token rules**, so the Next.js frontend works against either backend by changing `NEXT_PUBLIC_API_URL`.

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
  controller/   REST endpoints (/auth, /card, /user, /health)
  service/      business rules, ownership checks, @Transactional
  repository/   Spring Data JPA interfaces
  entity/       JPA entities (User, Card), enums, the JSONB Layout record
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
| `Card` document | `cards` table with `CHECK` constraints on `rating`, `status`, `type`, FK `username → users` |
| `$inc` on `tokenVersion` | atomic `UPDATE … SET token_version = token_version + 1` |

## Running locally

Requires JDK 25 and Docker.

**Easiest: throwaway database.** Starts Postgres in a container and the API on http://localhost:8080 with dev-only JWT secrets:

```bash
./mvnw spring-boot:test-run
```

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

The app refuses to start if a JWT secret is missing or too short.

## Tests

```bash
./mvnw test
```

Docker must be running: the API tests start a real PostgreSQL container, run the Flyway migrations and call every endpoint through the full security filter chain.

## API

Same as the Express API; see the [root README](../README.md#api). Differences that a client can notice:

- Ids are UUIDs instead of 24-character ObjectIds.
- A body that is not valid JSON, or has a field of the wrong type, returns `400 { "message": "Invalid request body." }`.
- An unknown header `key` in `PUT /user/layout` returns the status-list message instead of the header message.
