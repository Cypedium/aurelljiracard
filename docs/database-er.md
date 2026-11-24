# Database diagram

PostgreSQL schema of `server-java`, as built by the Flyway migrations `V1`–`V13` in
`server-java/src/main/resources/db/migration/`. Update this file when a migration changes tables,
keys, indexes or `CHECK` constraints.

- Solid lines are real foreign keys.
- Dotted lines are references checked only in code (no FK in the database).
- Columns are `NOT NULL` unless marked `NULL`. `CHECK` = enforced by the database;
  `default` = column default.

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR_32 username UK "case-insensitive in code"
        VARCHAR_100 password_hash "NULL = Google-only user"
        VARCHAR_255 google_sub UK "NULL, Google sub"
        VARCHAR_320 email "NULL"
        TEXT picture_url "data URL or http(s), max 1.5 MB"
        INTEGER token_version "default 0, bumped on logout, rename, role change"
        JSONB layout "cols, headers[], cards[]"
        VARCHAR_10 role "CHECK user | admin, default user (site role)"
        VARCHAR_2 language "NULL, CHECK en | sv"
        TIMESTAMPTZ last_active_at "NULL"
        TIMESTAMPTZ logged_out_at "NULL"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    boards {
        UUID id PK
        UUID owner_id FK,UK "one board per user"
        VARCHAR_64 invite_token_hash UK "NULL = no link, SHA-256 hex"
        TIMESTAMPTZ created_at
    }

    board_members {
        UUID board_id PK,FK
        UUID user_id PK,FK
        VARCHAR_10 role "CHECK admin (owner) | user"
        TIMESTAMPTZ joined_at
    }

    board_columns {
        UUID board_id PK,FK
        VARCHAR_32 column_key PK "unique per board"
        VARCHAR_50 title
        VARCHAR_7 color "NULL = default, #rrggbb"
        INTEGER position
    }

    issue_types {
        UUID board_id PK,FK
        VARCHAR_32 type_key PK "unique per board"
        VARCHAR_30 label
        VARCHAR_7 color "#rrggbb"
        VARCHAR_20 icon "one of CardType.ICONS"
        INTEGER position
    }

    cards {
        UUID id PK
        UUID board_id FK "UK with product_id"
        VARCHAR_200 product_id "issue key, UK per board"
        INTEGER rating "CHECK 1-5"
        VARCHAR_2000 comment "summary, markdown"
        VARCHAR_32 username FK "author"
        VARCHAR_32 assignee FK "NULL in backlog"
        VARCHAR_32 status "default todo, column_key or backlog"
        VARCHAR_32 type "default task, type_key"
        TIMESTAMPTZ submitted_at
    }

    refresh_tokens {
        UUID id PK "jti"
        UUID family_id "one family per login"
        UUID user_id FK
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ used_at "NULL = not used yet"
    }

    feature_switches {
        VARCHAR_32 feature_key PK "Feature enum key"
        BOOLEAN disabled "default false"
        TIMESTAMPTZ updated_at "NULL"
        UUID updated_by FK "NULL"
    }

    users ||--o| boards : "owns (ON DELETE CASCADE)"
    users ||--o{ board_members : "is member (ON DELETE CASCADE)"
    boards ||--|{ board_members : "has members (ON DELETE CASCADE)"
    boards ||--o{ board_columns : "has lists (ON DELETE CASCADE)"
    boards ||--o{ issue_types : "has issue types (ON DELETE CASCADE)"
    boards ||--o{ cards : "holds (no cascade)"
    users ||--o{ cards : "authors (ON UPDATE CASCADE, delete blocked)"
    users |o--o{ cards : "assigned (ON UPDATE CASCADE, ON DELETE SET NULL)"
    users ||--o{ refresh_tokens : "has (ON DELETE CASCADE)"
    users |o--o{ feature_switches : "last updated (ON DELETE SET NULL)"
    board_columns |o..o{ cards : "board_id + status (checked in ColumnService)"
    issue_types ||..o{ cards : "board_id + type (checked in IssueTypeService)"
```

## Notes

- `boards.owner_id` is `NOT NULL UNIQUE`, so the database allows a user without a board; the code
  always creates one (`BoardService.createFor` on register and first Google sign-in), and the owner
  is always a `board_members` row with role `admin`.
- `cards.username` and `cards.assignee` reference `users.username`, not `users.id`, so a rename
  follows through `ON UPDATE CASCADE` (`V5`). A user who still authors cards cannot be deleted.
- `cards.board_id` has no cascade: a board with cards blocks deleting its owner.
- `cards.status` is a `board_columns.column_key` on the same board (`board_id` + `status`), or
  `backlog` (not a list). `cards.type` is an `issue_types.type_key` on the same board
  (`board_id` + `type`). Neither is a foreign key; the services check them on create and update,
  and lists/types in use cannot be deleted (`409`).
- `refresh_tokens.family_id` groups the tokens of one login; it is not a foreign key.
- `users.layout` is embedded JSON (card order per list, keyed by card id), not a separate table.
- `flyway_schema_history` (Flyway's own table) is left out.

## Indexes

Besides primary keys and `UNIQUE` constraints:

| Index | Columns | Used for |
| --- | --- | --- |
| `cards_board_submitted_at_idx` | `cards (board_id, submitted_at DESC)` | a board's cards, newest first |
| `board_members_user_idx` | `board_members (user_id)` | the boards a user belongs to |
| `refresh_tokens_family_idx` | `refresh_tokens (family_id)` | deleting a family on token reuse |
| `refresh_tokens_user_expires_idx` | `refresh_tokens (user_id, expires_at)` | a user's live tokens |

## Seed data

The migrations insert rows, not only tables:

- `board_columns` and `issue_types`: every board existing at `V11` gets the defaults — lists
  `todo`, `in-progress`, `test`, `done`; issue types `task`, `bug`, `doc`. New boards get them from
  `BoardService.createFor` (`CardStatus.DEFAULT_COLUMNS`, `CardType.DEFAULTS`).
- `feature_switches`: one row per `Feature` enum key, all on (`V12`).
