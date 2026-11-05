import { z } from "zod";
import { RUDE_USERNAME_MESSAGE, isRudeUsername } from "./username";

// Base64 grows ~33%, so this stays under the backend's 1.5 MB data-URL limit
export const MAX_PICTURE_BYTES = 1024 * 1024;
// Same limits and messages as the backend (server/utils/username.js, server/utils/password.js)
export const USERNAME_MAX_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const USERNAME_MESSAGE = `Username is required (max ${USERNAME_MAX_LENGTH} characters).`;
const PASSWORD_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
export const PASSWORD_REPEAT_MESSAGE = "Password must not repeat characters (e.g. aaa or 1212).";
const MIN_DISTINCT_CHARACTERS = 4;

// "aaa" anywhere, or too few different characters ("12121212"). Only for new passwords, not login
export const isRepetitivePassword = (password: string): boolean =>
  /(.)\1\1/su.test(password) || new Set(password).size < MIN_DISTINCT_CHARACTERS;

// Blank check without trimming: the backend stores and looks up usernames as typed
const notBlank = (value: string) => value.trim().length > 0;

export const registerSchema = z.object({
  username: z
    .string()
    .refine(notBlank, USERNAME_MESSAGE)
    .max(USERNAME_MAX_LENGTH, USERNAME_MESSAGE)
    .refine((u) => !isRudeUsername(u), RUDE_USERNAME_MESSAGE),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, PASSWORD_MESSAGE)
    .max(MAX_PASSWORD_LENGTH, PASSWORD_MESSAGE)
    .refine((p) => !isRepetitivePassword(p), PASSWORD_REPEAT_MESSAGE),
  // Optional; a File in the browser, anything with a size in tests
  picture: z
    .custom<Blob>()
    .nullable()
    .refine((p) => !p || p.size <= MAX_PICTURE_BYTES, "Profile picture must be smaller than 1 MB."),
});

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().refine(notBlank, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export type LoginValues = z.infer<typeof loginSchema>;
