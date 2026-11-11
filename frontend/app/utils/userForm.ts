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
