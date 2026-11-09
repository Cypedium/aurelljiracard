jest.mock("../models/IssueType", () => ({
  listAll: jest.fn(),
  create: jest.fn()
}));

const request = require("supertest");
const app = require("../app");
const IssueType = require("../models/IssueType");
const { DEFAULT_ISSUE_TYPES, issueTypeKeyFromLabel } = require("../utils/cardType");
const { authHeader, USER_ID } = require("./helpers");

const adminHeader = () => authHeader("admin", USER_ID, "admin");
const defaultTypes = () => DEFAULT_ISSUE_TYPES.map((t, position) => ({ ...t, position, _id: "x", __v: 0 }));
const newType = { label: " User story ", color: "#22A06B", icon: "star" };

beforeEach(() => {
  jest.clearAllMocks();
  IssueType.listAll.mockResolvedValue(defaultTypes());
  IssueType.create.mockImplementation(async (doc) => doc);
});

describe("auth guard", () => {
  it.each([["get"], ["post"]])("%s /issue-type returns 401 without a token", async (method) => {
    const res = await request(app)[method]("/issue-type");

    expect(res.status).toBe(401);
  });

  it("POST /issue-type returns 403 for a regular user", async () => {
    const res = await request(app).post("/issue-type").set("Authorization", authHeader()).send(newType);

    expect(res.status).toBe(403);
    expect(IssueType.create).not.toHaveBeenCalled();
  });
});

describe("GET /issue-type", () => {
  it("returns the shared issue types in order, without database fields", async () => {
    const res = await request(app).get("/issue-type").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_ISSUE_TYPES.map((t, position) => ({ ...t, position })));
  });
});

describe("POST /issue-type", () => {
  it("adds an issue type at the end with a key made from the name", async () => {
    const res = await request(app).post("/issue-type").set("Authorization", adminHeader()).send(newType);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ key: "user-story", label: "User story", color: "#22a06b", icon: "star", position: 3 });
  });

  it("gives an issue type with a taken name a unique key", async () => {
    const res = await request(app)
      .post("/issue-type")
      .set("Authorization", adminHeader())
      .send({ ...newType, label: "Bug" });

    expect(res.body).toMatchObject({ key: "bug-2", label: "Bug" });
  });

  it("refuses more than 12 issue types", async () => {
    IssueType.listAll.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ key: `t${i}`, label: `T${i}`, position: i }))
    );

    const res = await request(app).post("/issue-type").set("Authorization", adminHeader()).send(newType);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("There can be at most 12 issue types.");
    expect(IssueType.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...newType, label: "" }],
    [{ ...newType, label: "x".repeat(31) }],
    [{ ...newType, label: { $ne: null } }],
    [{ ...newType, color: "green" }],
    [{ ...newType, color: undefined }],
    [{ ...newType, icon: "rocket" }],
    [{ ...newType, icon: undefined }]
  ])("rejects invalid issue type %j with 400", async (body) => {
    const res = await request(app).post("/issue-type").set("Authorization", adminHeader()).send(body);

    expect(res.status).toBe(400);
    expect(IssueType.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the same key was just added", async () => {
    IssueType.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

    const res = await request(app).post("/issue-type").set("Authorization", adminHeader()).send(newType);

    expect(res.status).toBe(409);
  });
});

describe("issueTypeKeyFromLabel", () => {
  it("makes a key from the name and falls back to 'type'", () => {
    expect(issueTypeKeyFromLabel("Förbättring", [])).toBe("forbattring");
    expect(issueTypeKeyFromLabel("???", [])).toBe("type");
  });
});
