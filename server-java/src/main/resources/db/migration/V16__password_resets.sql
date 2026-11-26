-- Forgot password: one row per reset link emailed (POST /auth/forgot-password); only the SHA-256 hex of the
-- token is stored. A link works once, for 1 hour; a new link or a reset removes the user's earlier links.
CREATE TABLE password_resets (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX password_resets_user_id_idx ON password_resets (user_id, created_at DESC);
