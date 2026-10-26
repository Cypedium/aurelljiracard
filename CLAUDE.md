# CLAUDE.md

Project-specific instructions for Aurell Gira Board. Where this file is more specific than a parent CLAUDE.md (folder layout, module system, response shape, branch names), this file wins.

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

Two independent npm projects — always `cd` into one before running npm. There is no root `package.json`.

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
  - `tests/unit/` — Jest via `next/jest`; import test globals from `@jest/globals`
- `PythonTests/` — manual smoke scripts against a running API (create real data; not run in CI)

`frontend/app/node_modules/` is a stray install — exclude it (and every `node_modules`) from searches.

## Commands

```bash
cd server   && npm test                                  # API tests
cd frontend && npx tsc --noEmit && npm test && npm run build
```

CI (`.github/workflows/ci.yml`) runs exactly these on pushes and PRs to `main`; run them before committing. There is no ESLint/Prettier config yet — `next lint` is not set up.

## Conventions

- **API paths**: backend mounts `/auth`, `/card`, `/user`. Frontend calls go through `endpoints.ts`, and `tests/unit/endpoints.test.ts` pins every path — update both together.
- **Responses**: success returns the resource or `{ message }`; errors return `{ message }` with a proper status (`400` validation, `401` missing/expired token, `403` forbidden, `404`, `409`). Do not switch to a `{ success, data }` envelope without migrating the frontend in the same change.
- **Auth**: every non-`/auth` route uses `authMiddleware`. Identity (`req.user.id`, `req.user.username`) comes from the token — never trust `username`/`userId` in the request body. Expired access tokens must return `401` (the frontend only refreshes on 401).
- **Tokens**: access 15m (`JWT_SECRET`, payload `{ id, username }`), refresh 7d (`REFRESH_SECRET`, payload `{ id, tokenVersion }`). Logout increments `User.tokenVersion` to revoke refresh tokens. Frontend stores tokens and `username` in `localStorage`.
- **Validation**: validate type and length of every body field in the controller (see `utils/validate.js`) before touching the DB. `mongoose.set('sanitizeFilter', true)` is on; still never pass raw objects from `req.body` into queries.
- **Logging**: never log tokens, passwords, `MONGO_URI` or full request bodies. Log `err.message` in controllers.
- **UI style**: board and forms follow Jira's look (colours `#172b4d` text, `#44546f` secondary, `#0c66e4` primary, `#f1f2f4` lanes). Reuse these in new UI.
- Comments in the codebase mix Swedish and English; either is fine, keep new ones short.

## Config and secrets

- `server/.env` is listed for ignore but **is still tracked in git** — never stage or commit it, and don't print its contents. Template: `server/.env.example`. Production secrets live in `fly secrets` for `aurellgiracard-backend`.
- `NEXT_PUBLIC_API_URL` is inlined at build time: `.env.local` locally, `[build.args]` in `frontend/fly.app.toml` for production.
- CORS origins: `CLIENT_URL` (comma-separated) in `server/app.js`.
- Never commit `.env*` files, credentials, tokens, or curl snippets containing them. Stage files by name, never `git add -A` / `git add .`.

## Deployment

Pushes to `main` deploy both Fly apps after CI passes (`fly.server.toml`, `fly.app.toml`, region `arn`). Changing Dockerfiles, Fly configs or workflows affects production — call it out in the PR.

## Data model

- `User`: `username` (unique), `passwordHash`, `pictureUrl` (base64 data URL or http(s), ≤1.5 MB), `tokenVersion`, embedded `layout { cols, headers[], cards[] }` — the board only reads `layout.cards`, and only for the order of cards within a column; `cols`/`headers` are written as the fixed four columns
- `Card`: `rating` 1–5 (form: "Priority", board: estimate pill), `comment` ("Summary"), `productId` ("Issue key"), `username` (author), `submittedAt` (set by the server on create, never changed), `type` (`task` | `bug` | `doc`, default `task`; lives in `server/utils/cardType.js` and must match `frontend/app/utils/cardType.ts`), `status` (board column: `todo` | `in-progress` | `test` | `done`, shared by all users; set via `PATCH /card/:id/status`, which any logged-in user may call). Statuses live in `server/utils/cardStatus.js` and must match `DEFAULT_HEADERS` keys in `frontend/app/utils/boardLayout.ts`

Schema changes need the user's approval.

## Git and PRs

- Branch names: `feature/<desc>`, `fix/<desc>`, `docs/<desc>`, `chore/<desc>` — see "Branch check" above.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), small focused commits.
- Push the branch and open a PR against `main`; never merge it yourself.
- The GitHub CLI (`gh`) is not installed here. If `gh` is missing, give the user the compare link `https://github.com/Cypedium/aurelljiracard/compare/main...<branch>?expand=1` plus a ready-to-paste title and description.
