// yy-mm-dd from an ISO date, e.g. "2026-10-19T…" → "26-10-19" (shown on the cards)
export const formatShortDate = (iso: string): string => iso.substring(2, 10);

// yyyy-mm-dd from an ISO date, e.g. "2026-10-19T…" → "2026-10-19" (shown in the edit dialog)
export const formatDate = (iso: string): string => iso.substring(0, 10);
