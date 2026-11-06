// Användarlistan (admin): när en användare senast var aktiv. "Online" räknar backenden ut
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// "Last seen 5 min ago" osv.; null = har inte loggat in sedan funktionen lades till
export const lastSeenLabel = (lastActiveAt: string | null | undefined, now: number = Date.now()): string => {
  if (!lastActiveAt) return "Never seen";
  const ago = Math.max(0, now - Date.parse(lastActiveAt));
  if (ago < MINUTE_MS) return "Last seen just now";
  if (ago < HOUR_MS) return `Last seen ${Math.floor(ago / MINUTE_MS)} min ago`;
  if (ago < DAY_MS) return `Last seen ${Math.floor(ago / HOUR_MS)} h ago`;
  const days = Math.floor(ago / DAY_MS);
  return `Last seen ${days} day${days === 1 ? "" : "s"} ago`;
};
