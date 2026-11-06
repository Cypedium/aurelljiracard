-- Presence for the admin user list (see server/utils/presence.js):
-- last_active_at is set on login and token refresh, logged_out_at on logout
ALTER TABLE users
    ADD COLUMN last_active_at TIMESTAMPTZ,
    ADD COLUMN logged_out_at  TIMESTAMPTZ;
