jest.mock("../models/User", () => {
  const User = jest.fn();
  User.findOne = jest.fn();
  User.findById = jest.fn();
  User.updateOne = jest.fn();
  return User;
});
jest.mock("../models/RefreshToken", () => ({
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn(),
  updateOne: jest.fn()
}));

const crypto = require("crypto");
const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateRefreshToken } = require("../utils/jwt");
const { USER_ID } = require("./helpers");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /auth/register", () => {
  it("creates a user and never stores the plain password", async () => {
    const save = jest.fn().mockResolvedValue({});
    User.findOne.mockResolvedValue(null);
    User.mockImplementation((doc) => ({ ...doc, save }));

    const res = await request(app).post("/auth/register").send({ username: "alice", password: "secret123" });

    expect(res.status).toBe(201);
    expect(save).toHaveBeenCalled();
    const stored = User.mock.calls[0][0];
    expect(stored.password).toBeUndefined();
    expect(await bcrypt.compare("secret123", stored.passwordHash)).toBe(true);
  });

  it("rejects a taken username with 409", async () => {
    User.findOne.mockResolvedValue({ username: "alice" });

    const res = await request(app).post("/auth/register").send({ username: "alice", password: "secret123" });

    expect(res.status).toBe(409);
  });

  it("treats a username in other casing as taken", async () => {
    User.findOne.mockResolvedValue({ username: "Mike" });

    const res = await request(app).post("/auth/register").send({ username: "mike", password: "secret123" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already taken.");
    const { username } = User.findOne.mock.calls[0][0];
    expect(username).toBeInstanceOf(RegExp);
    expect(username.test("Mike")).toBe(true);
  });

  it.each([
    ["fuckface", "secret123", "Username contains inappropriate words."],
    ["alice", "secret1", "Password must be 8-72 characters."],
    ["alice", "abc11112", "Password must not repeat characters (e.g. aaa or 1212)."],
    ["alice", "12121212", "Password must not repeat characters (e.g. aaa or 1212)."]
  ])("rejects %s / %s with %j", async (username, password, message) => {
    const res = await request(app).post("/auth/register").send({ username, password });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it.each([
    [{ password: "secret123" }],
    [{ username: "alice", password: "123" }],
    [{ username: { $ne: null }, password: "secret123" }],
    [{ username: "alice", password: "secret123", pictureUrl: "javascript:alert(1)" }]
  ])("rejects invalid input %j with 400", async (body) => {
    const res = await request(app).post("/auth/register").send(body);

    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login", () => {
  it("returns access and refresh tokens for valid credentials", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    User.findOne.mockResolvedValue({ _id: USER_ID, username: "alice", passwordHash, tokenVersion: 0 });

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "secret123" });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.accessToken, process.env.JWT_SECRET)).toMatchObject({ id: USER_ID, username: "alice", role: "user" });
    const refresh = jwt.verify(res.body.refreshToken, process.env.REFRESH_SECRET);
    expect(refresh).toMatchObject({ id: USER_ID, tokenVersion: 0, jti: expect.any(String) });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: USER_ID }, { $set: { lastActiveAt: expect.any(Date) } });
    // The refresh token is saved so it can be traded in once; each login is a new family
    expect(RefreshToken.create).toHaveBeenCalledWith({
      _id: refresh.jti,
      familyId: expect.any(String),
      userId: USER_ID,
      expiresAt: new Date(refresh.exp * 1000)
    });
  });

  it("still logs in when marking the user active fails", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    User.findOne.mockResolvedValue({ _id: USER_ID, username: "alice", passwordHash });
    User.updateOne.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "secret123" });

    expect(res.status).toBe(200);
    console.error.mockRestore();
  });

  it("logs in with the username in other casing and puts the stored name in the token", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: USER_ID, username: "Mike", passwordHash });

    const res = await request(app).post("/auth/login").send({ username: "mike", password: "secret123" });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.accessToken, process.env.JWT_SECRET)).toMatchObject({ username: "Mike" });
    expect(User.findOne.mock.calls[1][0].username).toBeInstanceOf(RegExp);
  });

  it("puts the admin role in the access token", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    User.findOne.mockResolvedValue({ _id: USER_ID, username: "alice", passwordHash, role: "admin" });

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "secret123" });

    expect(jwt.verify(res.body.accessToken, process.env.JWT_SECRET)).toMatchObject({ role: "admin" });
  });

  it("returns 401 for a wrong password", async () => {
    const passwordHash = await bcrypt.hash("secret123", 4);
    User.findOne.mockResolvedValue({ _id: USER_ID, username: "alice", passwordHash });

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "wrong" });

    expect(res.status).toBe(401);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("rejects non-string credentials (operator injection) with 400", async () => {
    const res = await request(app).post("/auth/login").send({ username: { $gt: "" }, password: "x" });

    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /auth/refresh", () => {
  const user = { _id: USER_ID, username: "alice", tokenVersion: 2 };

  beforeEach(() => {
    User.findById.mockResolvedValue(user);
  });

  it("trades an unused token for new tokens in the same family", async () => {
    RefreshToken.findOneAndUpdate.mockResolvedValue({ _id: "tok-1", familyId: "fam-1" });

    const res = await request(app).post("/auth/refresh").send({ refreshToken: generateRefreshToken(user, "tok-1") });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.accessToken, process.env.JWT_SECRET)).toMatchObject({ username: "alice" });
    expect(RefreshToken.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "tok-1", userId: USER_ID, usedAt: null },
      { $set: { usedAt: expect.any(Date) } }
    );
    const next = jwt.verify(res.body.refreshToken, process.env.REFRESH_SECRET);
    expect(next.jti).not.toBe("tok-1");
    expect(RefreshToken.create).toHaveBeenCalledWith(expect.objectContaining({ _id: next.jti, familyId: "fam-1" }));
    expect(User.updateOne).toHaveBeenCalledWith({ _id: USER_ID }, { $set: { lastActiveAt: expect.any(Date) } });
  });

  it("revokes the whole login when a used token comes back", async () => {
    RefreshToken.findOneAndUpdate.mockResolvedValue(null);
    RefreshToken.findOne.mockResolvedValue({ _id: "tok-1", familyId: "fam-1", usedAt: new Date() });

    const res = await request(app).post("/auth/refresh").send({ refreshToken: generateRefreshToken(user, "tok-1") });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Invalid refresh token");
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ familyId: "fam-1" });
    expect(RefreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown token id (revoked login) without deleting anything", async () => {
    RefreshToken.findOneAndUpdate.mockResolvedValue(null);
    RefreshToken.findOne.mockResolvedValue(null);

    const res = await request(app).post("/auth/refresh").send({ refreshToken: generateRefreshToken(user, "gone") });

    expect(res.status).toBe(403);
    expect(RefreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it("accepts a token from before single-use tokens once, keyed by its hash", async () => {
    // No jti, like tokens issued before this change
    const oldToken = jwt.sign({ id: USER_ID, tokenVersion: 2 }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
    const hash = crypto.createHash("sha256").update(oldToken).digest("hex");
    RefreshToken.findOneAndUpdate.mockResolvedValue({ _id: hash, familyId: "fam-old" });

    const res = await request(app).post("/auth/refresh").send({ refreshToken: oldToken });

    expect(res.status).toBe(200);
    expect(RefreshToken.updateOne).toHaveBeenCalledWith(
      { _id: hash },
      { $setOnInsert: { familyId: expect.any(String), userId: USER_ID, expiresAt: expect.any(Date) } },
      { upsert: true }
    );
    expect(RefreshToken.findOneAndUpdate.mock.calls[0][0]._id).toBe(hash);
    expect(RefreshToken.create).toHaveBeenCalledWith(expect.objectContaining({ familyId: "fam-old" }));
  });

  it("rejects a revoked refresh token with 403", async () => {
    const refreshToken = generateRefreshToken({ _id: USER_ID, tokenVersion: 0 }, "tok-1");
    User.findById.mockResolvedValue({ _id: USER_ID, username: "alice", tokenVersion: 1 });

    const res = await request(app).post("/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(403);
    expect(RefreshToken.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid refresh token with 403", async () => {
    const res = await request(app).post("/auth/refresh").send({ refreshToken: "garbage" });

    expect(res.status).toBe(403);
  });

  it("returns 401 when no refresh token is sent", async () => {
    const res = await request(app).post("/auth/refresh").send({});

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("revokes the user's refresh tokens and marks them logged out", async () => {
    User.updateOne.mockResolvedValue({});
    const refreshToken = generateRefreshToken({ _id: USER_ID, tokenVersion: 0 }, "tok-1");

    const res = await request(app).post("/auth/logout").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: USER_ID },
      { $inc: { tokenVersion: 1 }, $set: { loggedOutAt: expect.any(Date) } }
    );
  });

  it("succeeds without revoking anything for an invalid token", async () => {
    const res = await request(app).post("/auth/logout").send({ refreshToken: "garbage" });

    expect(res.status).toBe(200);
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});
