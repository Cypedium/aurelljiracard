// Jira-like avatar colours, picked consistently per username
export const AVATAR_COLORS = ["#0052cc", "#00875a", "#ff5630", "#6554c0", "#ff991f", "#00a3bf"];

export const avatarColor = (name: string): string => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const avatarInitials = (name: string): string => name.slice(0, 2).toUpperCase();
