# CLAUDE.md

Project-specific instructions for Aurell Jira Board. Where this file is more specific than a parent CLAUDE.md (folder layout, module system, response shape, branch names), this file wins.

## Branch check — do this first

Before changing any file for a new **feature**, **bug** or **fix** request (in English or Swedish, e.g. "lägg till", "fixa", "buggen"):

1. Run `git branch --show-current` and `git status --short`.
2. **On `main`** → create a branch before editing anything:
   ```bash
   git pull --ff-only
   git switch -c feature/<short-kebab-desc>   # new feature or improvement
   git switch -c fix/<short-kebab-desc>       # bug or fix
   ```
   For non-code work (docs, config, CLAUDE.md) use `docs/<desc>` or `chore/<desc>`. Tell the user the branch name in one line.
3. **On another branch** → if the request continues that branch's work (the user says "on the same branch", or it is a follow-up to it), stay. If it is unrelated, or the branch is already merged (`git branch --merged main` lists it), ask whether to start a new branch from `main`.
4. **Uncommitted changes** → leave the known local edit to `server/.env` alone (never stage it). Anything else: ask before switching branches.
5. Re-check the branch before every commit — the user may have switched or merged in between. Never commit, push or merge to `main`.

## Layout

Two independent npm projects plus a Maven project — always `cd` into one before running npm or `./mvnw`. There is no root `package.json`.

- `server/` — Express 5 + Mongoose 9, **CommonJS** (`require`/`module.exports`), entry `server.js` (DB connect + listen), `app.js` (Express app, exported for tests)
  - `routes/` → `controllers/` → `models/`; `middleware/authMiddleware.js`; `utils/jwt.js`, `utils/validate.js`
  - `tests/` — Jest + Supertest; models are `jest.mock`ed, no DB
  - `backupfiles/`, `scripts/` — one-off seed/maintenance scripts, not part of the app
- `frontend/` — Next.js 15 App Router, React 19, TypeScript, Tailwind 4 + CSS modules
  - `app/api/api.ts` — axios instance (attaches token, refreshes on 401); `app/api/endpoints.ts` — all API calls
  - `app/cards/Cards.tsx` — board: `react-grid-layout` v2, fixed columns To Do / In Progress / Test / Done, width from `useContainerWidth`
  - `app/cards/card/Card.tsx` — create form (Jira "create issue" style)
  - `app/utils/boardLayout.ts` — board columns and card placement (pure, unit-tested)
  - `app/components/` — `Layout`, `Navbar`, `Footer`, login/register forms
  - `app/components/ui/` — shadcn/ui components (`dialog`, `alert-dialog`, `button`, `sonner`, `select`, `input`, `label`, `textarea`, `form`), added with `npx shadcn@latest add <name>` (config: `components.json`). Owned code: edit freely, but keep `z-[1001]` on dialog overlays (Navbar is `z-[1000]`) and `z-[1002]` on `SelectContent` (it opens inside dialogs). `cn()` lives in `app/lib/utils.ts` — check new components import it from there, not from an npm package
  - Forms use react-hook-form + zod via shadcn `Form` (`FormField` → `FormItem` → `FormLabel`/`FormControl`/`FormMessage`), with `zodResolver` and `noValidate` on the `<form>`. Schemas live in `app/utils/` (`cardForm.ts`, `register.ts`) and are unit-tested; keep their limits and messages in sync with the backend controllers. Don't trim usernames (the backend stores them as typed). Field errors stay inline (`FormMessage`)
  - Styling: `LABEL_CLASS`, `FORM_ITEM_CLASS`, `FIELD_ERROR_CLASS`, `AUTH_FORM_CLASS` from `app/utils/styles.ts`. When `shadcn add` asks to overwrite an existing file, answer no (`yes n | npx shadcn@latest add <name>`)
  - Use `Dialog`/`AlertDialog` for modals and confirmations and `toast` from `sonner` for messages — never `alert`/`confirm`. `<Toaster richColors closeButton />` is in `client-layout.tsx`
  - Request/server errors → `toast.error(apiErrorMessage(err, "<fallback>"))` (`app/utils/apiError.ts` reads the backend's `{ message }`), not an inline error box. Repeating background errors get a fixed `id` so they replace each other. Log `err.message` only — a full axios error includes the `Authorization` header
  - Import alias `@/*` → `frontend/*` (used by `components/ui`; app code uses relative imports)
  - `tests/unit/` — Jest via `next/jest`; import test globals from `@jest/globals`
- `server-java/` — Spring Boot 4.1 + PostgreSQL port of `server/`, Java 25, Maven wrapper. Package `se.aurell.jiraboard` under `src/main/java/`:
  - `controller/` — `AuthController` (`/auth`), `CardController` (`/card`), `UserController` (`/user`), `HealthController` (`/health`). Thin: `@Valid @RequestBody`, `@AuthenticationPrincipal AuthUser`, delegate to a service
  - `service/` — business rules, ownership checks (`CardService.findOwnCard` → 403), `@Transactional` (reads `readOnly = true`)
  - `repository/` — Spring Data JPA; `UserRepository.incrementTokenVersion` is the atomic logout revoke
  - `entity/` — `User`, `Card`, enums `CardStatus` / `CardType` (API value via `@JsonValue`, stored via `EnumConverters`), `Layout` record stored as `JSONB`
  - `dto/` — request/response records; validation via Bean Validation annotations whose messages match the Express API. Responses use `@JsonProperty("_id")` for ids
  - `security/` — `JwtService` (Nimbus HS256 encode/decode), `AccessTokenConverter` (token → `AuthUser`), `ApiBearerTokenResolver` (ignores `Authorization` on `/auth/**` and `/health`), `JsonAuthenticationEntryPoint` (401 `{ message }`)
  - `config/` — `SecurityConfig` (stateless filter chain, CORS, BCrypt strength 10 so hashes match `server/`), `JwtProperties`, `CorsProperties`
  - `exception/` — throw `ApiException.badRequest/unauthorized/forbidden/notFound/conflict(...)`; `GlobalExceptionHandler` maps everything to `{ message }`
  - `src/main/resources/application.yml` — all config read from env vars; `db/migration/V1__init.sql` — `users` and `cards` tables
  - `src/test/` — `ApiIntegrationTest` base (`@SpringBootTest` + MockMvc + Testcontainers `postgres:17-alpine`, profile `dev`, wipes tables before each test); subclasses `AuthApiTest`, `CardApiTest`, `UserApiTest`; `security/JwtServiceTest`. `TestJiraboardApplication` runs the app locally against a throwaway container
  - Must stay API-compatible with `server/` (paths, `_id`, `{ message }` errors, status codes, token rules); change both together. Known differences: UUID ids, `400 "Invalid request body."` for malformed JSON/wrong field types (see `server-java/README.md`)
  - Schema only via Flyway (`src/main/resources/db/migration/V<n>__*.sql`); Hibernate runs `ddl-auto: validate`. Never edit an applied migration
  - Tests use Testcontainers — Docker must be running. Dev-only secrets live in `src/test/resources/application-dev.yml`
- `PythonTests/` — manual smoke scripts against a running API (create real data; not run in CI)

`frontend/app/node_modules/` is a stray install — exclude it (and every `node_modules`) from searches.

## Commands

```bash
cd server   && npm test                                  # API tests
cd frontend && npx tsc --noEmit && npm test && npm run build
cd server-java && ./mvnw test                            # Spring Boot API tests (needs Docker)
cd server-java && ./mvnw spring-boot:test-run            # run on :8080 against a throwaway Postgres container
```

CI (`.github/workflows/ci.yml`) runs the npm commands above (not `server-java` yet) on pushes and PRs to `main`; run them before committing. There is no ESLint/Prettier config yet — `next lint` is not set up.

## Conventions

- **API paths**: backend mounts `/auth`, `/card`, `/user` (`server-java` also has a public `GET /health`). Frontend calls go through `endpoints.ts`, and `tests/unit/endpoints.test.ts` pins every path — update both together.
- **Responses**: success returns the resource or `{ message }`; errors return `{ message }` with a proper status (`400` validation, `401` missing/expired token, `403` forbidden, `404`, `409`). Do not switch to a `{ success, data }` envelope without migrating the frontend in the same change.
- **Auth**: every non-`/auth` route uses `authMiddleware`. Identity (`req.user.id`, `req.user.username`) comes from the token — never trust `username`/`userId` in the request body. Expired access tokens must return `401` (the frontend only refreshes on 401).
  - Java: `SecurityConfig` permits `/auth/**`, `/health`, `/error`; everything else is `authenticated()`. Get identity from `@AuthenticationPrincipal AuthUser` (`id`, `username`), never from a DTO field.
- **Tokens**: access 15m (`JWT_SECRET`, payload `{ id, username, role }`), refresh 7d (`REFRESH_SECRET`, payload `{ id, tokenVersion }`). Logout increments `User.tokenVersion` to revoke refresh tokens. Frontend stores tokens and `username` in `localStorage`.
- **Validation**: validate type and length of every body field in the controller (see `utils/validate.js`) before touching the DB. `mongoose.set('sanitizeFilter', true)` is on; still never pass raw objects from `req.body` into queries.
  - Java: Bean Validation annotations on the request record (`@NotBlank`, `@Size`, `@Min`/`@Max`) with the same messages as `server/`; checks that annotations can't express (password byte length, picture URL) go in the service as `ApiException.badRequest`. Unknown `status`/`type` values are rejected by the enum's `@JsonCreator`.
- **Logging**: never log tokens, passwords, `MONGO_URI` or full request bodies. Log `err.message` in controllers. Java: only `GlobalExceptionHandler` logs unexpected errors (type + message); return expected errors by throwing `ApiException`, not by building `ResponseEntity`s in controllers.
- **UI style**: board and forms follow Jira's look (colours `#172b4d` text, `#44546f` secondary, `#0c66e4` primary, `#f1f2f4` lanes). Reuse these in new UI. shadcn tokens (`--primary`, `--border`, `--ring` …) in `app/root.css` are mapped to these colours; there is no dark mode (`dark:` only applies under a `.dark` class). Portaled content (dialogs, toasts) needs `font-jira` itself.
- Comments in the codebase mix Swedish and English; either is fine, keep new ones short.

## Config and secrets

- `server/.env` is listed for ignore but **is still tracked in git** — never stage or commit it, and don't print its contents. Template: `server/.env.example`. Production secrets live in `fly secrets` for `aurelljiraboard-backend` and `aurelljiraboardjava`.
- `NEXT_PUBLIC_API_URL` is inlined at build time: `.env.local` locally, `[build.args]` in `frontend/fly.app.toml` for production.
- CORS origins: `CLIENT_URL` (comma-separated) in `server/app.js` and `app.cors.allowed-origins` in `server-java/src/main/resources/application.yml`.
- `server-java` reads env vars only (Spring does not load `.env`): `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `REFRESH_SECRET` (each ≥32 bytes, app refuses to start otherwise), `PORT` (default 8080), `CLIENT_URL`. Template: `server-java/.env.example`. Never put real secrets in `application*.yml`.
- Never commit `.env*` files, credentials, tokens, or curl snippets containing them. Stage files by name, never `git add -A` / `git add .`.

## Deployment

Pushes to `main` deploy both Fly apps after CI passes (`fly.server.toml`, `fly.app.toml`, region `arn`). Changing Dockerfiles, Fly configs or workflows affects production — call it out in the PR. `server-java` is deployed by hand as Fly app `aurelljiraboardjava` (`fly deploy -c fly.java.toml` in `server-java/`, `Dockerfile.java`, external PostgreSQL via `DB_URL`); it has no CI job yet. The production frontend (`fly.app.toml` `NEXT_PUBLIC_API_URL`) points at `aurelljiraboardjava`, so deploy `server-java` before a change that needs it reaches `main`.

## Data model

- `User`: `username` (unique), `passwordHash`, `pictureUrl` (base64 data URL or http(s), ≤1.5 MB), `role` (`user` | `admin`, default `user`; admins may delete any card; set only in the database, no endpoint; lives in `server/utils/role.js`, must match `ROLES` in `frontend/app/utils/session.ts` and the Java `Role` enum, Postgres `CHECK` in `V3__user_role.sql`; tokens without a `role` claim read as `user`), `tokenVersion`, embedded `layout { cols, headers[], cards[] }` — the board reads `layout.cards` only for the order of cards within a column, and `headers[]` (`{ key, title, color? }`, always the fixed four columns) for each user's column names and optional list colour (`#rrggbb`, stored lowercase; `HEX_COLOR` must match in `server/controllers/userController.js`, `server-java` `LayoutRequest` and `frontend/app/utils/boardLayout.ts`)
- `Card`: `rating` 1–5 (form: "Priority", board: estimate pill), `comment` ("Summary"), `productId` ("Issue key", unique across all cards, exact match: Mongo unique index + `409 "Issue key already exists."`, Postgres `UNIQUE` from `V2__unique_product_id.sql`), `username` (author), `submittedAt` (set by the server on create, never changed), `type` (`task` | `bug` | `doc`, default `task`; lives in `server/utils/cardType.js` and must match `frontend/app/utils/cardType.ts`), `status` (board column: `todo` | `in-progress` | `test` | `done`, shared by all users; set via `PATCH /card/:id/status`, which any logged-in user may call). Statuses live in `server/utils/cardStatus.js` and must match `DEFAULT_HEADERS` keys in `frontend/app/utils/boardLayout.ts`
- PostgreSQL (`server-java`): `users` (UUID `id`, `username` VARCHAR(32) UNIQUE, `password_hash`, `picture_url` TEXT, `token_version`, `layout` JSONB, `created_at`/`updated_at`) and `cards` (UUID `id`, `CHECK` on `rating` 1–5, `status` and `type`, `username` FK → `users.username`, index on `submitted_at DESC`). Adding a status or type means changing `server/utils/`, `frontend/app/utils/`, the Java enum **and** a new Flyway migration for the `CHECK` constraint

Schema changes need the user's approval.

## Git and PRs

- Branch names: `feature/<desc>`, `fix/<desc>`, `docs/<desc>`, `chore/<desc>` — see "Branch check" above.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), small focused commits.
- Push the branch and open a PR against `main`; never merge it yourself.
- The GitHub CLI (`gh`) is not installed here. If `gh` is missing, give the user the compare link `https://github.com/Cypedium/aurelljiracard/compare/main...<branch>?expand=1` plus a ready-to-paste title and description.
