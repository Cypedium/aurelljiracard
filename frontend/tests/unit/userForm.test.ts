import { describe, expect, it } from "@jest/globals";
import { changedUserFields, countCardsByAuthor, editUserSchema } from "../../app/utils/userForm";

const firstError = (form: object) => {
  const result = editUserSchema.safeParse(form);
  return result.success ? null : result.error.issues[0].message;
};

describe("editUserSchema", () => {
  it("accepts a valid name and role, without trimming the name", () => {
    const result = editUserSchema.safeParse({ username: " bob ", role: "admin" });
    expect(result.success && result.data.username).toBe(" bob ");
  });

  it.each([
    ["a blank name", { username: "   ", role: "user" }],
    ["a too long name", { username: "x".repeat(33), role: "user" }],
  ])("rejects %s", (_name, form) => {
    expect(firstError(form)).toBe("Username is required (max 32 characters).");
  });

  it("rejects an unknown role", () => {
    expect(firstError({ username: "bob", role: "owner" })).not.toBeNull();
  });
});

describe("changedUserFields", () => {
  const current = { username: "bob", role: "user" } as const;

  it("returns only what changed", () => {
    expect(changedUserFields(current, { username: "robert", role: "user" })).toEqual({ username: "robert" });
    expect(changedUserFields(current, { username: "bob", role: "admin" })).toEqual({ role: "admin" });
    expect(changedUserFields(current, current)).toEqual({});
  });
});

describe("countCardsByAuthor", () => {
  it("counts cards per author", () => {
    expect(countCardsByAuthor([{ username: "a" }, { username: "b" }, { username: "a" }])).toEqual({ a: 2, b: 1 });
    expect(countCardsByAuthor([])).toEqual({});
  });
});
