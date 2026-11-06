// server/utils/presence.js
// Who is logged in, for the admin user list. Tokens are stateless, so this is an estimate:
// lastActiveAt is set on login and token refresh, loggedOutAt on logout (own or by an admin).
// An active user refreshes shortly after the 15-minute access token expires, hence 20 minutes.
// Must match ONLINE_WINDOW in server-java UserResponse
const ONLINE_WINDOW_MS = 20 * 60 * 1000;

const isOnline = (lastActiveAt, loggedOutAt, now = Date.now()) => {
  if (!lastActiveAt) return false;
  const active = new Date(lastActiveAt).getTime();
  if (now - active > ONLINE_WINDOW_MS) return false;
  return !loggedOutAt || new Date(loggedOutAt).getTime() < active;
};

// Admin view of a user's presence
const presence = ({ lastActiveAt, loggedOutAt }, now = Date.now()) => ({
  lastActiveAt: lastActiveAt ?? null,
  online: isOnline(lastActiveAt, loggedOutAt, now),
});

module.exports = { ONLINE_WINDOW_MS, isOnline, presence };
