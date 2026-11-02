import { z } from "zod";
import { registerSchema } from "./register";
import { ROLES } from "./session";

// Admin: byt namn och roll på en användare. Samma namnregler som register (och backend)
export const editUserSchema = z.object({
  username: registerSchema.shape.username,
  role: z.enum(ROLES),
});

export type EditUserValues = z.infer<typeof editUserSchema>;

// Bara ändrade fält skickas; tomt objekt = inget att spara
export const changedUserFields = (
  current: EditUserValues,
  next: EditUserValues,
): Partial<EditUserValues> => ({
  ...(next.username !== current.username ? { username: next.username } : {}),
  ...(next.role !== current.role ? { role: next.role } : {}),
});

// Antal kort per författare; användare med kort kan inte tas bort
export const countCardsByAuthor = (cards: { username: string }[]): Record<string, number> =>
  cards.reduce<Record<string, number>>((counts, { username }) => {
    counts[username] = (counts[username] ?? 0) + 1;
    return counts;
  }, {});
