jest.mock("../models/User", () => {
  const User = jest.fn();
  User.find = jest.fn();
  User.findById = jest.fn();
  User.deleteMany = jest.fn();
  return User;
});

const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const { authHeader, query, USER_ID } = require("./helpers");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("user routes", () => {
  it.each(["/user", "/user/usernames", "/user/layout"])("GET %s returns 401 without a token", async (path) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(401);
  });

  it("no longer exposes DELETE /user/delete-all", async () => {
    const res = await request(app).delete("/user/delete-all").set("Authorization", authHeader());

    expect(res.status).toBe(404);
    expect(User.deleteMany).not.toHaveBeenCalled();
  });

  it("GET /user returns usernames and pictures only", async () => {
    User.find.mockReturnValue(query([{ username: "alice", pictureUrl: "" }]));

    const res = await request(app).get("/user").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(User.find).toHaveBeenCalledWith({}, "username pictureUrl");
  });

  it("GET /user/usernames returns a list of names", async () => {
    User.find.mockReturnValue(query([{ username: "alice" }, { username: "bob" }]));

    const res = await request(app).get("/user/usernames").set("Authorization", authHeader());

    expect(res.body).toEqual(["alice", "bob"]);
  });
});

describe("layout", () => {
  it("GET /user/layout returns the logged-in user's layout", async () => {
    const layout = { cols: 6, headers: [], cards: [] };
    User.findById.mockReturnValue(query({ layout }));

    const res = await request(app).get("/user/layout").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual(layout);
    expect(User.findById).toHaveBeenCalledWith(USER_ID, "layout");
  });

  it("PUT /user/layout merges and saves the layout", async () => {
    const user = { layout: { cols: 6, headers: [], cards: [] }, save: jest.fn().mockResolvedValue({}) };
    User.findById.mockResolvedValue(user);
    const cards = [{ id: "c1", x: 0, y: 0, w: 2, h: 2 }];

    const res = await request(app).put("/user/layout").set("Authorization", authHeader()).send({ cards });

    expect(res.status).toBe(200);
    expect(user.layout).toEqual({ cols: 6, headers: [], cards });
    expect(user.save).toHaveBeenCalled();
  });

  it("PUT /user/layout saves renamed column headers, keeping only key and title", async () => {
    const user = { layout: { cols: 4, headers: [], cards: [] }, save: jest.fn().mockResolvedValue({}) };
    User.findById.mockResolvedValue(user);

    const res = await request(app)
      .put("/user/layout")
      .set("Authorization", authHeader())
      .send({ headers: [{ key: "todo", title: " Backlog ", extra: "x" }] });

    expect(res.status).toBe(200);
    expect(user.layout.headers).toEqual([{ key: "todo", title: "Backlog" }]);
  });

  it("PUT /user/layout saves an optional column color, lowercased", async () => {
    const user = { layout: { cols: 4, headers: [], cards: [] }, save: jest.fn().mockResolvedValue({}) };
    User.findById.mockResolvedValue(user);

    const res = await request(app)
      .put("/user/layout")
      .set("Authorization", authHeader())
      .send({ headers: [{ key: "todo", title: "To Do", color: "#FDD0EC" }, { key: "done", title: "Done", color: null }] });

    expect(res.status).toBe(200);
    expect(user.layout.headers).toEqual([{ key: "todo", title: "To Do", color: "#fdd0ec" }, { key: "done", title: "Done" }]);
  });

  it.each([
    [{ cols: 99 }],
    [{ cols: "6" }],
    [{ cards: "nope" }],
    [{ headers: [{ key: "archived", title: "Archive" }] }],
    [{ headers: [{ key: "todo", title: "   " }] }],
    [{ headers: [{ key: "todo", title: "x".repeat(51) }] }],
    [{ headers: [{ key: "todo", title: { $ne: null } }] }],
    [{ headers: [null] }],
    [{ headers: [{ key: "todo", title: "To Do", color: "red" }] }],
    [{ headers: [{ key: "todo", title: "To Do", color: "#fff" }] }],
    [{ headers: [{ key: "todo", title: "To Do", color: "#eed7fc; x" }] }],
    [{ headers: [{ key: "todo", title: "To Do", color: { $ne: null } }] }]
  ])("PUT rejects %j with 400", async (body) => {
    const res = await request(app).put("/user/layout").set("Authorization", authHeader()).send(body);

    expect(res.status).toBe(400);
    expect(User.findById).not.toHaveBeenCalled();
  });
});
