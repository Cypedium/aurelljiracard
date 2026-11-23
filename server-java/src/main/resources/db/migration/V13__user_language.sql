-- The UI language the user picked in the account menu; NULL = not picked yet (the frontend follows the browser).
-- Must match the Java Language enum and "languages" in shared/contract.json
ALTER TABLE users ADD COLUMN language VARCHAR(2)
    CHECK (language IN ('en', 'sv'));
