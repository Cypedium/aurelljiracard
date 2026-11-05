jest.mock("../models/User", () => {
  const User = jest.fn();
  User.find = jest.fn();
  User.findById = jest.fn();
  User.exists = jest.fn();
  User.updateOne = jest.fn();
  User.deleteOne = jest.fn();
  User.deleteMany = jest.fn();
  return User;
});

jest.mock("../models/Card", () => ({
  exists: jest.fn(),
  updateMany: jest.fn()
}));

const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const Card = require("../models/Card");
const { authHeader, query, USER_ID } = require("./helpers");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("user routes", () => {
  it.each(["/user", "/user/usernames", "/user/layout"])("GET %s returns 401 without a token", async (path) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(401);
  });

  it("no longer exposes DELETE /user/delete-all (it is just an invalid id now)", async () => {
    const res = await request(app).delete("/user/delete-all").set("Authorization", authHeader("boss", USER_ID, "admin"));

    expect(res.status).toBe(400);
    expect(User.deleteMany).not.toHaveBeenCalled();
  });

  it("GET /user returns usernames, pictures and roles only", async () => {
    User.find.mockReturnValue(query([{ username: "alice", pictureUrl: "", role: "user" }]));

    const res = await request(app).get("/user").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(User.find).toHaveBeenCalledWith({}, "username pictureUrl role");
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

  it("PUT /user/layout keeps the list key of saved card positions", async () => {
    const user = { layout: { cols: 4, headers: [], cards: [] }, save: jest.fn().mockResolvedValue({}) };
    User.findById.mockResolvedValue(user);
    const cards = [{ id: "c1", x: 2, y: 0, w: 1, h: 1, status: "test" }];

    const res = await request(app).put("/user/layout").set("Authorization", authHeader()).send({ cards });

    expect(res.status).toBe(200);
    expect(user.layout.cards).toEqual(cards);
  });

  it.each([[[null]], [[{ id: "c1", status: "Not a key" }]], [[{ id: "c1", status: { $ne: null } }]], [[{ id: "c1", status: "backlog" }]]])(
    "PUT /user/layout rejects card positions %j with 400",
    async (cards) => {
      const res = await request(app).put("/user/layout").set("Authorization", authHeader()).send({ cards });

      expect(res.status).toBe(400);
      expect(User.findById).not.toHaveBeenCalled();
    }
  );

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
    [{ headers: [{ key: "Not a key", title: "Archive" }] }],
    [{ headers: [{ key: "backlog", title: "Backlog" }] }],
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

describe("admin user management", () => {
  const OTHER_ID = "64b000000000000000000002";
  const admin = () => authHeader("boss", USER_ID, "admin");
  const storedUser = (fields) => ({
    _id: OTHER_ID, username: "bob", role: "user", tokenVersion: 0, pictureUrl: "", save: jest.fn().mockResolvedValue({}), ...fields
  });

  it.each([
    ["patch", `/user/${OTHER_ID}`],
    ["delete", `/user/${OTHER_ID}`],
    ["post", `/user/${OTHER_ID}/logout`]
  ])("%s %s is admins only", async (method, path) => {
    const res = await request(app)[method](path).set("Authorization", authHeader("alice")).send({ role: "admin" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Admins only.");
    expect(User.findById).not.toHaveBeenCalled();
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("renames a user, moves their cards to the new name and logs them out", async () => {
    const user = storedUser();
    User.findById.mockResolvedValue(user);
    User.exists.mockResolvedValue(null);

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "robert" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "robert", role: "user" });
    expect(user.tokenVersion).toBe(1);
    expect(user.save).toHaveBeenCalled();
    expect(Card.updateMany).toHaveBeenCalledWith({ username: "bob" }, { username: "robert" });
    expect(Card.updateMany).toHaveBeenCalledWith({ assignee: "bob" }, { assignee: "robert" });
  });

  it("changes the role and logs the user out", async () => {
    const user = storedUser();
    User.findById.mockResolvedValue(user);

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ role: "admin" });

    expect(res.body.role).toBe("admin");
    expect(user.tokenVersion).toBe(1);
    expect(Card.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing when nothing changes", async () => {
    const user = storedUser();
    User.findById.mockResolvedValue(user);

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "bob", role: "user" });

    expect(res.status).toBe(200);
    expect(user.save).not.toHaveBeenCalled();
  });

  it("returns 409 when the new username is taken", async () => {
    User.findById.mockResolvedValue(storedUser());
    User.exists.mockResolvedValue({ _id: "x" });

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "carol" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already taken.");
  });

  it("returns 409 when the new username is taken in other casing", async () => {
    User.findById.mockResolvedValue(storedUser());
    User.exists.mockResolvedValue({ _id: "x" });

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "Carol" });

    expect(res.status).toBe(409);
    expect(User.exists.mock.calls[0][0].username.test("carol")).toBe(true);
  });

  it("lets an admin change only the casing of a name", async () => {
    const user = storedUser();
    User.findById.mockResolvedValue(user);

    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "Bob" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("Bob");
    expect(User.exists).not.toHaveBeenCalled();
  });

  it("rejects a rude new username", async () => {
    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send({ username: "sh1thead" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Username contains inappropriate words.");
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("does not let an admin remove their own admin role", async () => {
    const res = await request(app).patch(`/user/${USER_ID}`).set("Authorization", admin()).send({ role: "user" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You cannot remove your own admin role.");
    expect(User.findById).not.toHaveBeenCalled();
  });

  it.each([
    ["a blank username", { username: "  " }],
    ["a too long username", { username: "x".repeat(33) }],
    ["an unknown role", { role: "owner" }],
    ["a non-string role", { role: { $ne: null } }]
  ])("returns 400 for %s", async (_name, body) => {
    const res = await request(app).patch(`/user/${OTHER_ID}`).set("Authorization", admin()).send(body);

    expect(res.status).toBe(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("deletes a user without cards and unassigns their cards", async () => {
    User.findById.mockResolvedValue(storedUser());
    Card.exists.mockResolvedValue(null);

    const res = await request(app).delete(`/user/${OTHER_ID}`).set("Authorization", admin());

    expect(res.status).toBe(200);
    expect(Card.updateMany).toHaveBeenCalledWith({ assignee: "bob" }, { assignee: null });
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: OTHER_ID });
  });

  it("does not delete a user who still has cards", async () => {
    User.findById.mockResolvedValue(storedUser());
    Card.exists.mockResolvedValue({ _id: "c1" });

    const res = await request(app).delete(`/user/${OTHER_ID}`).set("Authorization", admin());

    expect(res.status).toBe(409);
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it("does not let an admin delete themselves", async () => {
    const res = await request(app).delete(`/user/${USER_ID}`).set("Authorization", admin());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You cannot delete yourself.");
  });

  it("returns 404 for a missing user", async () => {
    User.findById.mockResolvedValue(null);

    const res = await request(app).delete(`/user/${OTHER_ID}`).set("Authorization", admin());

    expect(res.status).toBe(404);
  });

  it("logs a user out from all sessions", async () => {
    User.updateOne.mockResolvedValue({ matchedCount: 1 });

    const res = await request(app).post(`/user/${OTHER_ID}/logout`).set("Authorization", admin());

    expect(res.status).toBe(200);
    expect(User.updateOne).toHaveBeenCalledWith({ _id: OTHER_ID }, { $inc: { tokenVersion: 1 } });
  });

  it("returns 404 when logging out a missing user", async () => {
    User.updateOne.mockResolvedValue({ matchedCount: 0 });

    const res = await request(app).post(`/user/${OTHER_ID}/logout`).set("Authorization", admin());

    expect(res.status).toBe(404);
  });
});
