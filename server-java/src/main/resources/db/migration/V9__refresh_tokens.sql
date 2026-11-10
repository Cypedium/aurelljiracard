-- Single-use refresh tokens (see AuthService.refresh; Mongo: server/models/RefreshToken.js).
-- One row per issued refresh token (id = the token's jti), kept until it expires so a token
-- that comes back after being used is recognised. A login starts a family; each refresh
-- adds the next token to it, and reusing a token deletes the whole family.
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY,
    family_id  UUID        NOT NULL,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_user_expires_idx ON refresh_tokens (user_id, expires_at);
