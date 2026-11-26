import { z } from "zod";
import { RUDE_USERNAME_MESSAGE, isRudeUsername } from "./username";
import { msg } from "./i18n";

// Same limits and messages as the backend (server-java RegisterRequest, CredentialRules)
export const USERNAME_MAX_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

const USERNAME_MESSAGE = `Username is required (max ${USERNAME_MAX_LENGTH} characters).`;
const PASSWORD_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`;
export const PASSWORD_REPEAT_MESSAGE = msg("Password must not repeat characters (e.g. aaa or 1212).");
const MIN_DISTINCT_CHARACTERS = 4;

// "aaa" anywhere, or too few different characters ("12121212"). Only for new passwords, not login
export const isRepetitivePassword = (password: string): boolean =>
  /(.)\1\1/su.test(password) || new Set(password).size < MIN_DISTINCT_CHARACTERS;

// Blank check without trimming: the backend stores and looks up usernames as typed
const notBlank = (value: string) => value.trim().length > 0;

export const PASSWORD_MISMATCH_MESSAGE = msg("Passwords do not match.");

// Same pattern, limit and message as server-java RegisterRequest (shared/contract.json has samples)
export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MESSAGE = msg("Enter a valid email address (max 254 characters).");

const email = z.string().trim().max(EMAIL_MAX_LENGTH, EMAIL_MESSAGE).regex(EMAIL_PATTERN, EMAIL_MESSAGE);

// 409 when another account has verified the address (server-java EmailVerificationService)
export const EMAIL_TAKEN_MESSAGE = "Email already registered.";

// Login answers 403 with one of these until the email is verified (server-java AuthService)
export const EMAIL_MISSING_MESSAGE = "Please add your email address.";
export const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email address.";

// A new password and its confirmation (register, reset password)
const newPassword = {
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, PASSWORD_MESSAGE)
    .max(MAX_PASSWORD_LENGTH, PASSWORD_MESSAGE)
    .refine((p) => !isRepetitivePassword(p), PASSWORD_REPEAT_MESSAGE),
  // Frontend only: never sent to the backend
  confirmPassword: z.string(),
};

const passwordsMatch = (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword;

const passwordsMatchError = {
  message: PASSWORD_MISMATCH_MESSAGE,
  path: ["confirmPassword"],
  // Also check while other fields have errors, so every error shows on the first submit
  when: ({ value }: { value: unknown }) => {
    const v = value as { password?: unknown; confirmPassword?: unknown };
    return typeof v?.password === "string" && typeof v?.confirmPassword === "string";
  },
};

export const registerSchema = z
  .object({
    username: z
      .string()
      .refine(notBlank, USERNAME_MESSAGE)
      .max(USERNAME_MAX_LENGTH, USERNAME_MESSAGE)
      .refine((u) => !isRudeUsername(u), RUDE_USERNAME_MESSAGE),
    email,
    ...newPassword,
  })
  .refine(passwordsMatch, passwordsMatchError);

export type RegisterValues = z.infer<typeof registerSchema>;

// The page the password reset link opens
export const resetPasswordSchema = z.object(newPassword).refine(passwordsMatch, passwordsMatchError);

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// 400 from POST /auth/reset-password for an unknown, used or expired link (server-java PasswordResetService)
export const RESET_LINK_INVALID_MESSAGE = "This password reset link is invalid or has expired.";

export const loginSchema = z.object({
  // Username or email address
  username: z.string().refine(notBlank, msg("Username is required.")),
  password: z.string().min(1, msg("Password is required.")),
});

export type LoginValues = z.infer<typeof loginSchema>;

// Login → "add your email" (older accounts) or "use another address" (a typo at registration)
export const emailSchema = z.object({ email });

export type EmailValues = z.infer<typeof emailSchema>;
