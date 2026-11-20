import { z } from "zod";
import { registerSchema } from "./register";
import { ROLES } from "./session";

// Admin: rename a user and change their role. The same name rules as register (and the backend)
export const editUserSchema = z.object({
  username: registerSchema.shape.username,
  role: z.enum(ROLES),
});

export type EditUserValues = z.infer<typeof editUserSchema>;

// Only changed fields are sent; an empty object = nothing to save
export const changedUserFields = (
  current: EditUserValues,
  next: EditUserValues,
): Partial<EditUserValues> => ({
  ...(next.username !== current.username ? { username: next.username } : {}),
  ...(next.role !== current.role ? { role: next.role } : {}),
});
