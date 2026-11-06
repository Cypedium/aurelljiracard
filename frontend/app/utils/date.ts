// yy-mm-dd ur ett ISO-datum, t.ex. "2026-10-19T…" → "26-10-19" (visas på korten)
export const formatShortDate = (iso: string): string => iso.substring(2, 10);

// yyyy-mm-dd ur ett ISO-datum, t.ex. "2026-10-19T…" → "2026-10-19" (visas i edit-dialogen)
export const formatDate = (iso: string): string => iso.substring(0, 10);
