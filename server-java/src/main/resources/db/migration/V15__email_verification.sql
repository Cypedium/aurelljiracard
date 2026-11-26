-- Email at registration, verified by a link (POST /auth/verify-email). Login and token refresh need a
-- verified email. Google already verified the email of accounts that signed in with or connected Google,
-- so those count as verified (one account per address if two share one: the oldest).
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

UPDATE users SET email_verified_at = now()
WHERE id IN (
    SELECT DISTINCT ON (lower(email)) id FROM users
    WHERE google_sub IS NOT NULL AND email IS NOT NULL
    ORDER BY lower(email), created_at);

-- A verified address belongs to one account, in any casing. Unverified ones may repeat,
-- so nobody can block an address by registering it without access to the inbox.
CREATE UNIQUE INDEX users_verified_email_key ON users (lower(email)) WHERE email_verified_at IS NOT NULL;

-- One row per link sent; only the SHA-256 hex of the token is stored. email = the address the link
-- confirms, so a link stops working if the user enters another address afterwards.
CREATE TABLE email_verifications (
    token_hash VARCHAR(64)  PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    email      VARCHAR(320) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX email_verifications_user_id_idx ON email_verifications (user_id, created_at DESC);
