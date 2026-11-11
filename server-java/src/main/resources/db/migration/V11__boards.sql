-- Every user owns one board; others join it as collaborators through an invite link.
-- Cards, lists (board_columns) and issue types now belong to a board.
-- Existing data moves to the site admin's board (the oldest admin, else the oldest user), and every
-- other user is added to it as a collaborator so nobody loses access. Mongo: server/scripts/migrateBoards.js

CREATE TABLE boards (
    id                 UUID        PRIMARY KEY,
    -- One board per user; the name shown is "<owner>'s board"
    owner_id           UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    -- SHA-256 (hex) of the invite link's token; NULL = no link. The token itself is never stored
    invite_token_hash  VARCHAR(64) UNIQUE,
    created_at         TIMESTAMPTZ NOT NULL
);

-- The owner is 'admin' (lists, issue types, any card); collaborators are 'user'
CREATE TABLE board_members (
    board_id   UUID        NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       VARCHAR(10) NOT NULL CHECK (role IN ('user', 'admin')),
    joined_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (board_id, user_id)
);

CREATE INDEX board_members_user_idx ON board_members (user_id);

INSERT INTO boards (id, owner_id, created_at)
SELECT gen_random_uuid(), id, now() FROM users;

INSERT INTO board_members (board_id, user_id, role, joined_at)
SELECT id, owner_id, 'admin', now() FROM boards;

ALTER TABLE cards ADD COLUMN board_id UUID REFERENCES boards (id);
ALTER TABLE board_columns ADD COLUMN board_id UUID REFERENCES boards (id) ON DELETE CASCADE;
ALTER TABLE issue_types ADD COLUMN board_id UUID REFERENCES boards (id) ON DELETE CASCADE;

DO $$
DECLARE
    main_board UUID;
    main_owner UUID;
BEGIN
    SELECT b.id, b.owner_id INTO main_board, main_owner
    FROM boards b JOIN users u ON u.id = b.owner_id
    ORDER BY (u.role = 'admin') DESC, u.created_at, u.id
    LIMIT 1;

    IF main_board IS NULL THEN
        -- No users, so no cards: the shared defaults are seeded per board from now on
        DELETE FROM board_columns;
        DELETE FROM issue_types;
    ELSE
        INSERT INTO board_members (board_id, user_id, role, joined_at)
        SELECT main_board, id, 'user', now() FROM users WHERE id <> main_owner;

        UPDATE cards SET board_id = main_board;
        UPDATE board_columns SET board_id = main_board;
        UPDATE issue_types SET board_id = main_board;
    END IF;
END $$;

-- Keys are unique per board (before the other boards get their own "todo", "task" …)
ALTER TABLE board_columns DROP CONSTRAINT board_columns_pkey;
ALTER TABLE board_columns ADD PRIMARY KEY (board_id, column_key);
ALTER TABLE issue_types DROP CONSTRAINT issue_types_pkey;
ALTER TABLE issue_types ADD PRIMARY KEY (board_id, type_key);

-- The other boards start with the default lists and issue types.
-- Must match CardStatus.DEFAULT_COLUMNS / CardType.DEFAULTS and server/utils/cardStatus.js, cardType.js
INSERT INTO board_columns (board_id, column_key, title, position)
SELECT b.id, d.column_key, d.title, d.position
FROM boards b
CROSS JOIN (VALUES ('todo', 'To Do', 0), ('in-progress', 'In Progress', 1), ('test', 'Test', 2), ('done', 'Done', 3))
    AS d (column_key, title, position)
WHERE NOT EXISTS (SELECT 1 FROM board_columns c WHERE c.board_id = b.id);

INSERT INTO issue_types (board_id, type_key, label, color, icon, position)
SELECT b.id, d.type_key, d.label, d.color, d.icon, d.position
FROM boards b
CROSS JOIN (VALUES ('task', 'Task', '#4bade8', 'check', 0), ('bug', 'Bug', '#c9372c', 'bug', 1),
                   ('doc', 'Doc', '#8270db', 'doc', 2))
    AS d (type_key, label, color, icon, position)
WHERE NOT EXISTS (SELECT 1 FROM issue_types t WHERE t.board_id = b.id);

ALTER TABLE cards ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE board_columns ALTER COLUMN board_id SET NOT NULL;
ALTER TABLE issue_types ALTER COLUMN board_id SET NOT NULL;

ALTER TABLE cards DROP CONSTRAINT cards_product_id_key;
ALTER TABLE cards ADD CONSTRAINT cards_board_product_id_key UNIQUE (board_id, product_id);

-- GET /board/{id}/card lists newest first
DROP INDEX cards_submitted_at_idx;
CREATE INDEX cards_board_submitted_at_idx ON cards (board_id, submitted_at DESC);
