import { describe, expect, it } from "@jest/globals";
import {
  MAX_PASSWORD_LENGTH,
  MAX_PICTURE_BYTES,
  PASSWORD_REPEAT_MESSAGE,
  USERNAME_MAX_LENGTH,
  isRepetitivePassword,
  loginSchema,
  registerSchema,
} from "../../app/utils/register";
import { RUDE_USERNAME_MESSAGE, isRudeUsername } from "../../app/utils/username";

const valid = { username: "alice", password: "secret123", picture: null };

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

  it("rejects rude usernames", () => {
    expect(firstError(registerSchema, { ...valid, username: "Sh1t_head" })).toBe(RUDE_USERNAME_MESSAGE);
  });

  it.each(["secret1", "x".repeat(MAX_PASSWORD_LENGTH + 1)])("rejects password of length %#", (password) => {
    expect(firstError(registerSchema, { ...valid, password })).toBe("Password must be 8-72 characters.");
  });

  it.each(["abc11112", "12121212"])("rejects repetitive password %s", (password) => {
    expect(firstError(registerSchema, { ...valid, password })).toBe(PASSWORD_REPEAT_MESSAGE);
  });

  it("rejects pictures over the size limit", () => {
    const picture = new Blob([new Uint8Array(MAX_PICTURE_BYTES + 1)]);
    expect(firstError(registerSchema, { ...valid, picture })).toMatch(/smaller than 1 MB/);
  });
});

// Same cases as server/tests/usernamePassword.test.js
describe("isRudeUsername", () => {
  it.each(["fuck", "MotherFucker", "sh1t_head", "f.u.c.k", "Jävla", "fitta99"])("rejects %s", (name) => {
    expect(isRudeUsername(name)).toBe(true);
  });

  it.each(["mike", "Mike", "Cassandra", "Dickens", "peacock", "Scott", "Åsa"])("accepts %s", (name) => {
    expect(isRudeUsername(name)).toBe(false);
  });
});

describe("isRepetitivePassword", () => {
  it.each(["aaaaaaaa", "abc11112", "12121212", "abababab", "abcabcab"])("rejects %s", (password) => {
    expect(isRepetitivePassword(password)).toBe(true);
  });

  it.each(["secret123", "abcd1234", "aabbccdd", "Tr0ub4dor"])("accepts %s", (password) => {
    expect(isRepetitivePassword(password)).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires both fields, without the new-password rules", () => {
    expect(firstError(loginSchema, { username: "alice", password: "x" })).toBeNull();
    expect(firstError(loginSchema, { username: " ", password: "x" })).toBe("Username is required.");
    expect(firstError(loginSchema, { username: "alice", password: "" })).toBe("Password is required.");
  });
});
