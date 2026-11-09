-- Issue types, shared by all users; admins add new ones.
-- A card's type is an issue type key, checked in CardService, so the fixed CHECK goes
CREATE TABLE issue_types (
    -- Lowercase letters and digits joined by hyphens, e.g. 'user-story'
    type_key    VARCHAR(32) PRIMARY KEY,
    label       VARCHAR(30) NOT NULL,
    -- Icon background, #rrggbb lowercase
    color       VARCHAR(7)  NOT NULL,
    -- One of CardType.ICONS
    icon        VARCHAR(20) NOT NULL,
    -- Order in the issue type dropdown
    position    INTEGER     NOT NULL
);

-- Must match DEFAULT_ISSUE_TYPES in server/utils/cardType.js
INSERT INTO issue_types (type_key, label, color, icon, position) VALUES
    ('task', 'Task', '#4bade8', 'check', 0),
    ('bug', 'Bug', '#c9372c', 'bug', 1),
    ('doc', 'Doc', '#8270db', 'doc', 2);

ALTER TABLE cards DROP CONSTRAINT cards_type_check;
ALTER TABLE cards ALTER COLUMN type TYPE VARCHAR(32);
