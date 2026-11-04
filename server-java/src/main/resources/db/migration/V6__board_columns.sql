-- Board columns (lists), shared by all users; admins add, rename and recolour them.
-- A card's status is a column key or 'backlog', checked in CardService, so the fixed CHECK goes
CREATE TABLE board_columns (
    -- Lowercase letters and digits joined by hyphens, e.g. 'in-progress'
    column_key  VARCHAR(32) PRIMARY KEY,
    title       VARCHAR(50) NOT NULL,
    -- #rrggbb, lowercase; NULL = the default colour
    color       VARCHAR(7),
    -- Order on the board, left to right
    position    INTEGER     NOT NULL
);

-- Must match DEFAULT_COLUMNS in server/utils/cardStatus.js
INSERT INTO board_columns (column_key, title, position) VALUES
    ('todo', 'To Do', 0),
    ('in-progress', 'In Progress', 1),
    ('test', 'Test', 2),
    ('done', 'Done', 3);

ALTER TABLE cards DROP CONSTRAINT cards_status_check;
ALTER TABLE cards ALTER COLUMN status TYPE VARCHAR(32);
