// The user list (admin): when a user was last active. The backend works out "Online"
import { interpolate, msg, type Translate } from "./i18n";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// "Last seen 5 min ago" etc.; null = hasn't logged in since the feature was added. English unless t is given
export const lastSeenLabel = (
  lastActiveAt: string | null | undefined,
  now: number = Date.now(),
  t: Translate = interpolate,
): string => {
  if (!lastActiveAt) return t(msg("Never seen"));
  const ago = Math.max(0, now - Date.parse(lastActiveAt));
  if (ago < MINUTE_MS) return t(msg("Last seen just now"));
  if (ago < HOUR_MS) return t(msg("Last seen {count} min ago"), { count: Math.floor(ago / MINUTE_MS) });
  if (ago < DAY_MS) return t(msg("Last seen {count} h ago"), { count: Math.floor(ago / HOUR_MS) });
  const days = Math.floor(ago / DAY_MS);
  return days === 1 ? t(msg("Last seen 1 day ago")) : t(msg("Last seen {count} days ago"), { count: days });
};
