const { isRudeUsername, usernameIgnoreCase, sameUsername } = require("../utils/username");
const { isRepetitivePassword } = require("../utils/password");

describe("isRudeUsername", () => {
  it.each(["fuck", "MotherFucker", "sh1t_head", "f.u.c.k", "Jävla", "fitta99"])("rejects %s", (name) => {
    expect(isRudeUsername(name)).toBe(true);
  });

  it.each(["mike", "Mike", "Cassandra", "Dickens", "peacock", "Scott", "Åsa"])("accepts %s", (name) => {
    expect(isRudeUsername(name)).toBe(false);
  });
});

describe("usernameIgnoreCase", () => {
  it("matches the whole name in any casing", () => {
    expect(usernameIgnoreCase("Mike").test("mike")).toBe(true);
    expect(usernameIgnoreCase("Mike").test("MIKE")).toBe(true);
    expect(usernameIgnoreCase("Mike").test("mikeal")).toBe(false);
  });

  it("treats special characters literally", () => {
    expect(usernameIgnoreCase("a.b").test("axb")).toBe(false);
    expect(usernameIgnoreCase(".*").test("anything")).toBe(false);
    expect(usernameIgnoreCase("a+b").test("A+B")).toBe(true);
  });

  it("sameUsername ignores case", () => {
    expect(sameUsername("Mike", "mike")).toBe(true);
    expect(sameUsername("Mike", "Mikael")).toBe(false);
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
