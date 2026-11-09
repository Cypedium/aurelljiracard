jest.mock("../models/Column", () => ({
  listAll: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  bulkWrite: jest.fn(),
  deleteOne: jest.fn()
}));

jest.mock("../models/Card", () => ({
  exists: jest.fn()
}));

const request = require("supertest");
const app = require("../app");
const Column = require("../models/Column");
const Card = require("../models/Card");
const { DEFAULT_COLUMNS, columnKeyFromTitle, isColumnKey } = require("../utils/cardStatus");
const { authHeader, USER_ID } = require("./helpers");

const adminHeader = () => authHeader("admin", USER_ID, "admin");
const defaultColumns = () => DEFAULT_COLUMNS.map((c, position) => ({ ...c, color: null, position, _id: "x", __v: 0 }));

beforeEach(() => {
  jest.clearAllMocks();
  Column.listAll.mockResolvedValue(defaultColumns());
  Column.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Card.exists.mockResolvedValue(null);
});

describe("auth guard", () => {
  it.each([
    ["get", "/column"],
    ["post", "/column"],
    ["put", "/column/todo"],
    ["put", "/column"],
    ["delete", "/column/test"]
  ])("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
  });

  it.each([
    ["post", "/column"],
    ["put", "/column/todo"],
    ["put", "/column"]
  ])("%s %s returns 403 for a regular user", async (method, path) => {
    const res = await request(app)[method](path).set("Authorization", authHeader()).send({ title: "Review", keys: [] });

    expect(res.status).toBe(403);
    expect(Column.create).not.toHaveBeenCalled();
    expect(Column.findOne).not.toHaveBeenCalled();
    expect(Column.bulkWrite).not.toHaveBeenCalled();
  });
});

describe("GET /column", () => {
  it("returns the shared lists in board order, without database fields", async () => {
    const res = await request(app).get("/column").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_COLUMNS.map((c, position) => ({ ...c, color: null, position })));
  });
});

describe("POST /column", () => {
  it("adds a list at the end with a key made from the title", async () => {
    Column.create.mockImplementation(async (doc) => doc);

    const res = await request(app)
      .post("/column")
      .set("Authorization", adminHeader())
      .send({ title: " Code review ", color: "#FDD0EC" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ key: "code-review", title: "Code review", color: "#fdd0ec", position: 4 });
  });

  it("gives a list with a taken name a unique key", async () => {
    Column.create.mockImplementation(async (doc) => doc);

    const res = await request(app).post("/column").set("Authorization", adminHeader()).send({ title: "Test" });

    expect(res.body).toMatchObject({ key: "test-2", title: "Test", color: null });
  });

  it("refuses more than 12 lists", async () => {
    Column.listAll.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ key: `l${i}`, title: `L${i}`, position: i }))
    );

    const res = await request(app).post("/column").set("Authorization", adminHeader()).send({ title: "One more" });

    expect(res.status).toBe(400);
    expect(Column.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the same key was added in between", async () => {
    Column.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

    const res = await request(app).post("/column").set("Authorization", adminHeader()).send({ title: "Review" });

    expect(res.status).toBe(409);
  });

  it.each([
    [{}],
    [{ title: "   " }],
    [{ title: "x".repeat(51) }],
    [{ title: { $ne: null } }],
    [{ title: "Review", color: "red" }],
    [{ title: "Review", color: "#fff" }],
    [{ title: "Review", color: { $ne: null } }]
  ])("rejects %j with 400", async (body) => {
    const res = await request(app).post("/column").set("Authorization", adminHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Column.create).not.toHaveBeenCalled();
  });
});

describe("PUT /column/:key", () => {
  const storedColumn = (fields) => ({ key: "todo", title: "To Do", color: null, position: 0, save: jest.fn(), ...fields });

  it("renames and recolours a list for everyone", async () => {
    const column = storedColumn();
    Column.findOne.mockResolvedValue(column);

    const res = await request(app)
      .put("/column/todo")
      .set("Authorization", adminHeader())
      .send({ title: " Ready ", color: "#1F845A", key: "hijack", position: 9 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: "todo", title: "Ready", color: "#1f845a", position: 0 });
    expect(column.save).toHaveBeenCalled();
  });

  it("resets the colour when color is null", async () => {
    Column.findOne.mockResolvedValue(storedColumn({ color: "#fdd0ec" }));

    const res = await request(app).put("/column/todo").set("Authorization", adminHeader()).send({ title: "To Do", color: null });

    expect(res.body.color).toBeNull();
  });

  it("returns 404 for an unknown list", async () => {
    Column.findOne.mockResolvedValue(null);

    const res = await request(app).put("/column/nope").set("Authorization", adminHeader()).send({ title: "Nope" });

    expect(res.status).toBe(404);
  });

  it.each([
    ["an invalid key", "Not%20a%20key", { title: "Ready" }],
    ["the backlog", "backlog", { title: "Ready" }],
    ["a missing title", "todo", {}],
    ["an invalid colour", "todo", { title: "Ready", color: "blue" }]
  ])("returns 400 for %s", async (_name, key, body) => {
    const res = await request(app).put(`/column/${key}`).set("Authorization", adminHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Column.findOne).not.toHaveBeenCalled();
  });
});

describe("PUT /column", () => {
  it("moves lists for everyone and returns them in the new order", async () => {
    const keys = ["done", "todo", "in-progress", "test"];

    const res = await request(app).put("/column").set("Authorization", adminHeader()).send({ keys });

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.key)).toEqual(keys);
    expect(res.body.map((c) => c.position)).toEqual([0, 1, 2, 3]);
    expect(res.body[0]).toEqual({ key: "done", title: "Done", color: null, position: 0 });
    expect(Column.bulkWrite).toHaveBeenCalledWith(
      keys.map((key, position) => ({ updateOne: { filter: { key }, update: { $set: { position } } } }))
    );
  });

  it.each([
    ["no keys", {}],
    ["keys that are not strings", { keys: [{ $ne: null }, "todo", "test", "done"] }],
    ["a missing list", { keys: ["todo", "in-progress", "test"] }],
    ["an unknown list", { keys: ["todo", "in-progress", "test", "nope"] }],
    ["a list twice", { keys: ["todo", "todo", "test", "done"] }]
  ])("returns 400 for %s", async (_name, body) => {
    const res = await request(app).put("/column").set("Authorization", adminHeader()).send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("List order must contain every list exactly once.");
    expect(Column.bulkWrite).not.toHaveBeenCalled();
  });
});

describe("columnKeyFromTitle", () => {
  it("makes a lowercase key without accents", () => {
    expect(columnKeyFromTitle("Klart för test!", [])).toBe("klart-for-test");
    expect(columnKeyFromTitle("  QA  ", [])).toBe("qa");
  });

  it("falls back to 'list' when nothing is left", () => {
    expect(columnKeyFromTitle("???", [])).toBe("list");
  });

  it("never returns a taken key or the backlog", () => {
    expect(columnKeyFromTitle("Done", ["done", "done-2"])).toBe("done-3");
    expect(columnKeyFromTitle("Backlog", [])).toBe("backlog-2");
  });

  it("keeps keys short enough for a suffix", () => {
    const key = columnKeyFromTitle("a very long list name that goes on and on", []);
    expect(key.length).toBeLessThanOrEqual(24);
    expect(isColumnKey(key)).toBe(true);
  });
});

describe("DELETE /column/:key", () => {
  const del = (key, header = adminHeader()) => request(app).delete(`/column/${key}`).set("Authorization", header);

  it("deletes an empty list", async () => {
    const res = await del("test");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("List deleted.");
    expect(Card.exists).toHaveBeenCalledWith({ status: "test" });
    expect(Column.deleteOne).toHaveBeenCalledWith({ key: "test" });
  });

  it("returns 403 for a regular user", async () => {
    const res = await del("test", authHeader());

    expect(res.status).toBe(403);
    expect(Column.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 409 while the list has cards", async () => {
    Card.exists.mockResolvedValue({ _id: "c1" });

    const res = await del("test");

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("The list still has cards. Move or delete them first.");
    expect(Column.deleteOne).not.toHaveBeenCalled();
  });

  it("keeps the default list", async () => {
    const res = await del("todo");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("The default list cannot be deleted.");
    expect(Column.listAll).not.toHaveBeenCalled();
  });

  it.each([["backlog"], ["Not%20a%20key"]])("returns 400 for %s", async (key) => {
    const res = await del(key);

    expect(res.status).toBe(400);
    expect(Column.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown list", async () => {
    const res = await del("review");

    expect(res.status).toBe(404);
    expect(Column.deleteOne).not.toHaveBeenCalled();
  });
});
