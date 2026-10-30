// yy-mm-dd ur ett ISO-datum, t.ex. "2026-10-19T…" → "26-10-19" (visas på korten)
export const formatShortDate = (iso: string): string => iso.substring(2, 10);
