# Database: making it more compact and faster

Ideas for `server-java` and its PostgreSQL schema, reviewed against migrations V1–V13. None of this is implemented yet.
At the current data size nothing is slow; these are the things that grow badly as users, cards and logins pile up.

Items marked **schema** need a Flyway migration and the owner's approval (see `CLAUDE.md`).

## Summary

| # | Change | Gain | Schema | Risk |
|---|--------|------|--------|------|
| 1 | Profile pictures out of `users.picture_url` | Payload and row size | yes | medium (API + frontend) |
| 2 | Indexes on `cards` foreign keys and lookups | Speed | yes (index only) | low |
| 3 | `lower(username)` unique index | Speed + correctness | yes (index only) | low |
| 4 | Scheduled cleanup of `refresh_tokens` | Size | no | low |
| 5 | Prune `users.layout` JSONB | Size, write bloat | no (option: yes) | low |
| 6 | Time-ordered UUIDs (v7) | Index size, locality | no | low |
| 7 | `cards.user_id` instead of `username` | Size, cheap renames | yes | high |
| 8 | Fewer queries per board-scoped request | Latency | no | low |
| 9 | JDBC batching and pool size | Latency | no | low |

Suggested first step: 2, 3, 4 and 6 together (one migration plus a few lines of Java, no API change). Item 1 has the largest payoff.

## 1. Move profile pictures out of `users.picture_url` (schema)

- `picture_url` holds a base64 data URL of up to 1.5 MB, about 33% larger than the raw image.
- `UserRepository.findAllPublic`/`findAllWithPresence` (`GET /user`) and `BoardMemberRepository.findMembers` return `pictureUrl` for every row, so these responses can be several MB.
- `findById(User)` loads the full row, picture included, for logout, rename, language and layout requests.

Options:

- **Separate table**: `user_pictures (user_id PK → users ON DELETE CASCADE, content_type, data BYTEA)`, served by `GET /user/{id}/picture` with `Cache-Control` and an ETag. Lists return only that URL. Changes `endpoints.ts` and `endpoints.test.ts`.
- **Smaller step, no new endpoint**: resize and recompress on upload (e.g. 128×128 WebP), so each picture is about 5–15 KB.

## 2. Index the `cards` foreign keys and lookups (schema, index only)

PostgreSQL does not index the referencing side of a foreign key. Today these scan all of `cards`:

- a rename (`ON UPDATE CASCADE` on `cards.username` and `cards.assignee`, V5)
- a user delete (`ON DELETE SET NULL` on `cards.assignee`)
- `CardRepository.existsByUsername` (user delete check)

These scan every card on the board (via `cards_board_submitted_at_idx`):

- `existsByBoardIdAndStatus` (delete list)
- `existsByBoardIdAndType` (delete issue type)

```sql
CREATE INDEX cards_username_idx     ON cards (username);
CREATE INDEX cards_assignee_idx     ON cards (assignee) WHERE assignee IS NOT NULL;
CREATE INDEX cards_board_status_idx ON cards (board_id, status);
CREATE INDEX cards_board_type_idx   ON cards (board_id, type);
```

## 3. Case-insensitive username index (schema, index only)

`existsByUsernameIgnoreCase` and `findFirstByUsernameIgnoreCase` compile to `lower(username) = lower(?)`, which can't use the `UNIQUE (username)` index. That means a full scan on register, rename, Google sign-in username picking and mixed-case logins.

```sql
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
```

It also makes the database enforce "Mike = mike", which today is checked only in code (two concurrent registrations can both pass). Map the resulting `DataIntegrityViolationException` to the existing `409`.

Check for case-only duplicates before deploying, or the migration fails:

```sql
SELECT lower(username), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
```

## 4. Clean up `refresh_tokens` on a schedule

`AuthService` calls `deleteExpired(userId, now)` only for the user who is refreshing. Rows of users who never come back stay forever (every login adds rows).

- Add `@EnableScheduling` and a daily job: `DELETE FROM refresh_tokens WHERE expires_at < now()`.
- Safe if several Fly machines run it at the same time.
- An index on `expires_at` is optional; the daily delete is cheap without it at this size.

## 5. Prune `users.layout`

`users.layout` (JSONB) holds card positions for all of a user's boards. `mergeBoardPositions` (`frontend/app/utils/boardLayout.ts`) keeps positions of other boards untouched, so positions of deleted cards and of boards the user left are never removed.

Every drag rewrites the whole JSONB value and creates a new version of the user row, so a large layout means more write volume and table bloat.

- In `UserService.updateLayout`, drop positions whose card no longer exists or is on a board the user isn't a member of.
- Stop storing the legacy `headers[]` and `content` fields (the board reads only `id`, `status`, `y`).
- Longer term (schema): a `card_positions (user_id, card_id, status, y)` table with `ON DELETE CASCADE` from both sides, so a drag updates only the cards that moved and cleanup is automatic.

## 6. Time-ordered UUIDs

`User` and `Card` use `@GeneratedValue(strategy = GenerationType.UUID)` (random v4); `Board` and `RefreshToken` set `UUID.randomUUID()` in code. Random keys land all over the B-tree, causing page splits, indexes about 30–50% larger than needed and more random I/O.

- Use Hibernate's `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` on the generated ids, and a UUIDv7 helper where ids are created in code.
- Column type stays `UUID`, so no migration. Existing rows keep their ids.
- Side effect: ids reveal creation time (roughly). Acceptable here, since `submitted_at` is already public.

## 7. Reference users by id on cards (schema, large)

`cards.username` and `cards.assignee` are `VARCHAR(32)` foreign keys to `users.username`.

- A `user_id UUID` (16 bytes, fixed) is smaller and joins faster.
- A rename would no longer rewrite every card the user wrote or is assigned.
- Touches `Card`, `CardResponse`, `CardService`, the frontend (author/assignee display) and tests. Only worth it bundled with another `cards` migration.

## 8. Fewer queries per board-scoped request

`CardService.create` currently makes up to six round trips:

1. Feature switch query (`FeatureInterceptor`)
2. `BoardService.requireMember`
3. `IssueTypeService.requireCardType`
4. `ColumnService.requireCardStatus`
5. `existsByBoardIdAndProductId`
6. Insert

Ideas:

- Drop step 5: the `UNIQUE (board_id, product_id)` constraint and `saveUnique` already turn a duplicate into `409 "Issue key already exists."` (the update path likewise).
- Check type and status in one query (`EXISTS … AND EXISTS …`). A composite foreign key from `cards (board_id, status)` doesn't fit because of `backlog`.
- The uncached feature switch query is deliberate (a kill switch must work at once on every machine, `docs/feature-switches.md`). If it ever needs to go: a 1–2 second cache or PostgreSQL `LISTEN/NOTIFY`, not a long cache.

## 9. Configuration

In `server-java/src/main/resources/application.yml`:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc.batch_size: 20
        order_inserts: true
        order_updates: true
  datasource:
    hikari:
      maximum-pool-size: ${DB_POOL_SIZE:5}
```

- Batching: `BoardService.createFor` makes 9 single inserts (board, member, 4 lists, 3 issue types); with batching, the lists and the issue types each go in one round trip.
- Pool size: Hikari defaults to 10 connections per Fly machine; match it to the connection limit of the external PostgreSQL plan.

## Checklist when implementing

- One Flyway migration per change (`V<n>__*.sql`), never edit an applied one.
- Update `docs/database-er.md` and `docs/backend-map.html` when tables, indexes or endpoints change.
- `cd server-java && ./mvnw test` (Docker), and the frontend commands if the API changes.
