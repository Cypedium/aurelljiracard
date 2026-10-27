import { describe, expect, it } from "@jest/globals";
import {
  MAX_PASSWORD_LENGTH,
  MAX_PICTURE_BYTES,
  USERNAME_MAX_LENGTH,
  loginSchema,
  registerSchema,
} from "../../app/utils/register";

const valid = { username: "alice", password: "secret1", picture: null };

const firstError = (schema: typeof registerSchema | typeof loginSchema, form: object) => {
  const result = schema.safeParse(form);
  return result.success ? null : result.error.issues[0].message;
};

describe("registerSchema", () => {
  it("accepts a valid form with or without a picture", () => {
    expect(firstError(registerSchema, valid)).toBeNull();
    expect(firstError(registerSchema, { ...valid, picture: new Blob(["x"]) })).toBeNull();
  });

  it.each(["", "   ", "a".repeat(USERNAME_MAX_LENGTH + 1)])("rejects username %j", (username) => {
    expect(firstError(registerSchema, { ...valid, username })).toBe("Username is required (max 32 characters).");
  });

  it.each(["12345", "x".repeat(MAX_PASSWORD_LENGTH + 1)])("rejects password of length %#", (password) => {
    expect(firstError(registerSchema, { ...valid, password })).toBe("Password must be 6-72 characters.");
  });

  it("rejects pictures over the size limit", () => {
    const picture = new Blob([new Uint8Array(MAX_PICTURE_BYTES + 1)]);
    expect(firstError(registerSchema, { ...valid, picture })).toMatch(/smaller than 1 MB/);
  });
});

describe("loginSchema", () => {
  it("requires both fields", () => {
    expect(firstError(loginSchema, { username: "alice", password: "x" })).toBeNull();
    expect(firstError(loginSchema, { username: " ", password: "x" })).toBe("Username is required.");
    expect(firstError(loginSchema, { username: "alice", password: "" })).toBe("Password is required.");
  });
});
