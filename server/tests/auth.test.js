jest.mock("../models/User", () => {
  const User = jest.fn();
  User.findOne = jest.fn();
  User.findById = jest.fn();
  User.updateOne = jest.fn();
  return User;
});

const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/User");
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
    expect(jwt.verify(res.body.refreshToken, process.env.REFRESH_SECRET)).toMatchObject({ id: USER_ID, tokenVersion: 0 });
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
  });

  it("rejects non-string credentials (operator injection) with 400", async () => {
    const res = await request(app).post("/auth/login").send({ username: { $gt: "" }, password: "x" });

    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /auth/refresh", () => {
  it("issues new tokens when the token version matches", async () => {
    const user = { _id: USER_ID, username: "alice", tokenVersion: 2 };
    User.findById.mockResolvedValue(user);

    const res = await request(app).post("/auth/refresh").send({ refreshToken: generateRefreshToken(user) });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.accessToken, process.env.JWT_SECRET)).toMatchObject({ username: "alice" });
  });

  it("rejects a revoked refresh token with 403", async () => {
    const refreshToken = generateRefreshToken({ _id: USER_ID, tokenVersion: 0 });
    User.findById.mockResolvedValue({ _id: USER_ID, username: "alice", tokenVersion: 1 });

    const res = await request(app).post("/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(403);
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
  it("revokes the user's refresh tokens", async () => {
    User.updateOne.mockResolvedValue({});
    const refreshToken = generateRefreshToken({ _id: USER_ID, tokenVersion: 0 });

    const res = await request(app).post("/auth/logout").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(User.updateOne).toHaveBeenCalledWith({ _id: USER_ID }, { $inc: { tokenVersion: 1 } });
  });

  it("succeeds without revoking anything for an invalid token", async () => {
    const res = await request(app).post("/auth/logout").send({ refreshToken: "garbage" });

    expect(res.status).toBe(200);
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});
