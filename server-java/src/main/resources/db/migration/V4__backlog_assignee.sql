-- Backlog: cards not yet on the board, with no assignee. Statuses must match server/utils/cardStatus.js
ALTER TABLE cards DROP CONSTRAINT cards_status_check;
ALTER TABLE cards ADD CONSTRAINT cards_status_check
    CHECK (status IN ('todo', 'in-progress', 'test', 'done', 'backlog'));

-- Who works on the card; null in the backlog. Existing cards are assigned to their author
ALTER TABLE cards ADD COLUMN assignee VARCHAR(32) REFERENCES users (username);
UPDATE cards SET assignee = username;
