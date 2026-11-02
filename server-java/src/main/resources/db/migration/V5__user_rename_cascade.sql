-- Admins may rename and delete users (PATCH/DELETE /user/{id}).
-- A rename updates cards.username and cards.assignee; deleting a user unassigns their cards.
-- Users who still author cards cannot be deleted (no ON DELETE on cards.username).
ALTER TABLE cards DROP CONSTRAINT cards_username_fkey;
ALTER TABLE cards ADD CONSTRAINT cards_username_fkey
    FOREIGN KEY (username) REFERENCES users (username) ON UPDATE CASCADE;

ALTER TABLE cards DROP CONSTRAINT cards_assignee_fkey;
ALTER TABLE cards ADD CONSTRAINT cards_assignee_fkey
    FOREIGN KEY (assignee) REFERENCES users (username) ON UPDATE CASCADE ON DELETE SET NULL;
