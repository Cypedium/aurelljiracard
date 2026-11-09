jest.mock("../models/IssueType", () => ({
  listAll: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  deleteOne: jest.fn()
}));

jest.mock("../models/Card", () => ({
  exists: jest.fn()
}));

const request = require("supertest");
const app = require("../app");
const IssueType = require("../models/IssueType");
const Card = require("../models/Card");
const { DEFAULT_ISSUE_TYPES, issueTypeKeyFromLabel } = require("../utils/cardType");
const { authHeader, USER_ID } = require("./helpers");

const adminHeader = () => authHeader("admin", USER_ID, "admin");
const defaultTypes = () => DEFAULT_ISSUE_TYPES.map((t, position) => ({ ...t, position, _id: "x", __v: 0 }));
const newType = { label: " User story ", color: "#22A06B", icon: "star" };

beforeEach(() => {
  jest.clearAllMocks();
  IssueType.listAll.mockResolvedValue(defaultTypes());
  IssueType.create.mockImplementation(async (doc) => doc);
  IssueType.findOne.mockReturnValue({ lean: () => Promise.resolve({ key: "bug", label: "Bug" }) });
  IssueType.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Card.exists.mockResolvedValue(null);
});

describe("auth guard", () => {
  it.each([
    ["get", "/issue-type"],
    ["post", "/issue-type"],
    ["delete", "/issue-type/bug"]
  ])("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
  });

  it("POST /issue-type returns 403 for a regular user", async () => {
    const res = await request(app).post("/issue-type").set("Authorization", authHeader()).send(newType);

    expect(res.status).toBe(403);
    expect(IssueType.create).not.toHaveBeenCalled();
  });

  it("DELETE /issue-type/:key returns 403 for a regular user", async () => {
    const res = await request(app).delete("/issue-type/bug").set("Authorization", authHeader());

    expect(res.status).toBe(403);
    expect(IssueType.deleteOne).not.toHaveBeenCalled();
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

describe("DELETE /issue-type/:key", () => {
  const del = (key) => request(app).delete(`/issue-type/${key}`).set("Authorization", adminHeader());

  it("deletes an issue type that no card uses", async () => {
    const res = await del("bug");

    expect(res.status).toBe(200);
    expect(Card.exists).toHaveBeenCalledWith({ type: "bug" });
    expect(IssueType.deleteOne).toHaveBeenCalledWith({ key: "bug" });
  });

  it("returns 409 while cards use the issue type", async () => {
    Card.exists.mockResolvedValue({ _id: "c1" });

    const res = await del("bug");

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Cards still use this issue type. Change or delete them first.");
    expect(IssueType.deleteOne).not.toHaveBeenCalled();
  });

  it("keeps the default issue type", async () => {
    const res = await del("task");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("The default issue type cannot be deleted.");
    expect(IssueType.findOne).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown issue type", async () => {
    IssueType.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

    const res = await del("epic");

    expect(res.status).toBe(404);
    expect(IssueType.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed key", async () => {
    const res = await del("Not%20a%20key");

    expect(res.status).toBe(400);
    expect(IssueType.findOne).not.toHaveBeenCalled();
  });
});

describe("issueTypeKeyFromLabel", () => {
  it("makes a key from the name and falls back to 'type'", () => {
    expect(issueTypeKeyFromLabel("Förbättring", [])).toBe("forbattring");
    expect(issueTypeKeyFromLabel("???", [])).toBe("type");
  });
});
