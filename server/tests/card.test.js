jest.mock("../models/Card", () => {
  const Card = jest.fn();
  Card.find = jest.fn();
  Card.findById = jest.fn();
  Card.exists = jest.fn();
  Card.findByIdAndUpdate = jest.fn();
  Card.deleteOne = jest.fn();
  return Card;
});
jest.mock("../models/Column", () => ({ listAll: jest.fn() }));
jest.mock("../models/IssueType", () => ({ listAll: jest.fn() }));

const request = require("supertest");
const app = require("../app");
const Card = require("../models/Card");
const Column = require("../models/Column");
const IssueType = require("../models/IssueType");
const { DEFAULT_COLUMNS } = require("../utils/cardStatus");
const { DEFAULT_ISSUE_TYPES } = require("../utils/cardType");
const jwt = require("jsonwebtoken");
const { authHeader, query, USER_ID } = require("./helpers");

const CARD_ID = "64c000000000000000000001";
const validCard = { rating: 4, comment: "Looks good", productId: "AUR-1" };

beforeEach(() => {
  jest.clearAllMocks();
  Card.exists.mockResolvedValue(null);
  // The four default lists plus one an admin added
  Column.listAll.mockResolvedValue([...DEFAULT_COLUMNS, { key: "review", title: "Review" }]);
  // The three default issue types plus one an admin added
  IssueType.listAll.mockResolvedValue([...DEFAULT_ISSUE_TYPES, { key: "story", label: "Story" }]);
});

describe("auth guard", () => {
  it.each([
    ["get", "/card"],
    ["post", "/card"],
    ["put", `/card/${CARD_ID}`],
    ["patch", `/card/${CARD_ID}/status`],
    ["delete", `/card/${CARD_ID}`]
  ])("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
  });

  it("returns 401 for an invalid token so the client can refresh", async () => {
    const res = await request(app).get("/card").set("Authorization", "Bearer not-a-jwt");

    expect(res.status).toBe(401);
  });
});

describe("GET /card", () => {
  it("returns all cards", async () => {
    Card.find.mockReturnValue(query([{ ...validCard, username: "alice" }]));

    const res = await request(app).get("/card").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("POST /card", () => {
  it("saves the card as the logged-in user, ignoring any username in the body", async () => {
    const save = jest.fn().mockResolvedValue({});
    Card.mockImplementation((doc) => ({ ...doc, save }));

    const res = await request(app)
      .post("/card")
      .set("Authorization", authHeader("alice"))
      .send({ ...validCard, username: "mallory" });

    expect(res.status).toBe(201);
    expect(Card.mock.calls[0][0].username).toBe("alice");
    expect(save).toHaveBeenCalled();
  });

  it("creates the card in the given column", async () => {
    Card.mockImplementation((doc) => ({ ...doc, save: jest.fn().mockResolvedValue({}) }));

    const res = await request(app)
      .post("/card")
      .set("Authorization", authHeader())
      .send({ ...validCard, status: "test" });

    expect(res.status).toBe(201);
    expect(Card.mock.calls[0][0].status).toBe("test");
    expect(Card.mock.calls[0][0].assignee).toBe("alice");
  });

  it("creates a backlog card without an assignee", async () => {
    Card.mockImplementation((doc) => ({ ...doc, save: jest.fn().mockResolvedValue({}) }));

    const res = await request(app)
      .post("/card")
      .set("Authorization", authHeader("alice"))
      .send({ ...validCard, status: "backlog" });

    expect(res.status).toBe(201);
    expect(Card.mock.calls[0][0]).toMatchObject({ status: "backlog", assignee: null, username: "alice" });
  });

  it("saves the issue type and always uses today's date", async () => {
    Card.mockImplementation((doc) => ({ ...doc, save: jest.fn().mockResolvedValue({}) }));

    const res = await request(app)
      .post("/card")
      .set("Authorization", authHeader())
      .send({ ...validCard, type: "bug", submittedAt: "2020-01-01T00:00:00.000Z" });

    expect(res.status).toBe(201);
    expect(Card.mock.calls[0][0].type).toBe("bug");
    // Left out so the schema default (Date.now) applies
    expect(Card.mock.calls[0][0]).not.toHaveProperty("submittedAt");
  });

  it("accepts an issue type an admin added", async () => {
    Card.mockImplementation((doc) => ({ ...doc, save: jest.fn().mockResolvedValue({}) }));

    const res = await request(app).post("/card").set("Authorization", authHeader()).send({ ...validCard, type: "story" });

    expect(res.status).toBe(201);
    expect(Card.mock.calls[0][0].type).toBe("story");
  });

  it("lists the stored issue types when the type is unknown", async () => {
    const res = await request(app).post("/card").set("Authorization", authHeader()).send({ ...validCard, type: "epic" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Type must be one of: task, bug, doc, story.");
  });

  it("rejects a duplicate issue key with 409", async () => {
    Card.exists.mockResolvedValue({ _id: CARD_ID });

    const res = await request(app).post("/card").set("Authorization", authHeader()).send(validCard);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Issue key already exists.");
    expect(Card.exists).toHaveBeenCalledWith({ productId: validCard.productId });
    expect(Card).not.toHaveBeenCalled();
  });

  it("returns 409 when the unique index catches a concurrent duplicate", async () => {
    const save = jest.fn().mockRejectedValue(Object.assign(new Error("E11000 duplicate key"), { code: 11000 }));
    Card.mockImplementation((doc) => ({ ...doc, save }));

    const res = await request(app).post("/card").set("Authorization", authHeader()).send(validCard);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Issue key already exists.");
  });

  it.each([
    [{ ...validCard, status: "archived" }],
    [{ ...validCard, status: { $ne: null } }],
    [{ ...validCard, rating: 0 }],
    [{ ...validCard, rating: "5" }],
    [{ ...validCard, comment: "" }],
    [{ ...validCard, productId: { $ne: null } }],
    [{ ...validCard, productId: "1MA-10" }],
    [{ ...validCard, productId: "MA-1000" }],
    [{ ...validCard, productId: "MA100" }],
    [{ ...validCard, type: "epic" }],
    [{ ...validCard, type: { $ne: null } }]
  ])("rejects invalid card %j with 400", async (body) => {
    const res = await request(app).post("/card").set("Authorization", authHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Card).not.toHaveBeenCalled();
  });
});

describe("PUT /card/:id", () => {
  it("updates the user's own card and returns it", async () => {
    const save = jest.fn().mockResolvedValue({});
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "alice", ...validCard, save });

    const res = await request(app)
      .put(`/card/${CARD_ID}`)
      .set("Authorization", authHeader("alice"))
      .send({ ...validCard, comment: "Edited", rating: 2, username: "mallory" });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
    expect(res.body).toMatchObject({ comment: "Edited", rating: 2, username: "alice" });
  });

  it("changes the issue type but never the creation date", async () => {
    const submittedAt = "2026-10-01T00:00:00.000Z";
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "alice", ...validCard, type: "task", submittedAt, save: jest.fn() });

    const res = await request(app)
      .put(`/card/${CARD_ID}`)
      .set("Authorization", authHeader("alice"))
      .send({ ...validCard, type: "doc", submittedAt: "2020-01-01T00:00:00.000Z" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: "doc", submittedAt });
  });

  it("lets a card keep its own issue key", async () => {
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "alice", ...validCard, save: jest.fn() });
    Card.exists.mockResolvedValue({ _id: CARD_ID });

    const res = await request(app).put(`/card/${CARD_ID}`).set("Authorization", authHeader("alice")).send(validCard);

    expect(res.status).toBe(200);
  });

  it("rejects an issue key used by another card with 409", async () => {
    const save = jest.fn();
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "alice", ...validCard, save });
    Card.exists.mockResolvedValue({ _id: "64c000000000000000000002" });

    const res = await request(app)
      .put(`/card/${CARD_ID}`)
      .set("Authorization", authHeader("alice"))
      .send({ ...validCard, productId: "AUR-2" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Issue key already exists.");
    expect(save).not.toHaveBeenCalled();
  });

  it("refuses to edit another user's card with 403", async () => {
    const save = jest.fn();
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "bob", save });

    const res = await request(app).put(`/card/${CARD_ID}`).set("Authorization", authHeader("alice")).send(validCard);

    expect(res.status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing card", async () => {
    Card.findById.mockResolvedValue(null);

    const res = await request(app).put(`/card/${CARD_ID}`).set("Authorization", authHeader()).send(validCard);

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).put("/card/not-an-id").set("Authorization", authHeader()).send(validCard);

    expect(res.status).toBe(400);
  });

  it.each([
    [{ ...validCard, rating: 6 }],
    [{ ...validCard, comment: "   " }],
    [{ ...validCard, productId: { $ne: null } }],
    [{ ...validCard, type: "epic" }]
  ])("rejects invalid card %j with 400", async (body) => {
    const res = await request(app).put(`/card/${CARD_ID}`).set("Authorization", authHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Card.findById).not.toHaveBeenCalled();
  });
});

describe("PATCH /card/:id/status", () => {
  const storedCard = (fields) => ({ _id: CARD_ID, username: "bob", assignee: "bob", status: "todo", save: jest.fn(), ...fields });

  it("lets any logged-in user move a card and returns it", async () => {
    const card = storedCard();
    Card.findById.mockResolvedValue(card);

    const res = await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader("alice"))
      .send({ status: "done" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "done", assignee: "bob" });
    expect(card.save).toHaveBeenCalled();
  });

  it("only updates the status, ignoring other fields in the body", async () => {
    Card.findById.mockResolvedValue(storedCard());

    const res = await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader())
      .send({ status: "test", comment: "hijack", username: "mallory", assignee: "mallory" });

    expect(res.body).toMatchObject({ status: "test", username: "bob", assignee: "bob" });
    expect(res.body.comment).toBeUndefined();
  });

  it("assigns a card taken from the backlog to the caller", async () => {
    Card.findById.mockResolvedValue(storedCard({ status: "backlog", assignee: null }));

    const res = await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader("alice"))
      .send({ status: "todo", assignee: "mallory" });

    expect(res.body).toMatchObject({ status: "todo", assignee: "alice" });
  });

  it("unassigns a card moved to the backlog", async () => {
    Card.findById.mockResolvedValue(storedCard({ status: "in-progress" }));

    const res = await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader("alice"))
      .send({ status: "backlog" });

    expect(res.body).toMatchObject({ status: "backlog", assignee: null });
  });

  it("returns 404 for a missing card", async () => {
    Card.findById.mockResolvedValue(null);

    const res = await request(app).patch(`/card/${CARD_ID}/status`).set("Authorization", authHeader()).send({ status: "todo" });

    expect(res.status).toBe(404);
  });

  it("accepts a list an admin added", async () => {
    Card.findById.mockResolvedValue(storedCard());

    const res = await request(app).patch(`/card/${CARD_ID}/status`).set("Authorization", authHeader()).send({ status: "review" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "review" });
  });

  it("lists the current lists in the error message", async () => {
    const res = await request(app).patch(`/card/${CARD_ID}/status`).set("Authorization", authHeader()).send({ status: "archived" });

    expect(res.body.message).toBe("Status must be one of: todo, in-progress, test, done, review, backlog.");
  });

  it.each([
    ["an unknown status", CARD_ID, { status: "archived" }],
    ["a non-string status", CARD_ID, { status: { $ne: null } }],
    ["a missing status", CARD_ID, {}],
    ["a malformed id", "not-an-id", { status: "todo" }]
  ])("returns 400 for %s", async (_name, id, body) => {
    const res = await request(app).patch(`/card/${id}/status`).set("Authorization", authHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Card.findById).not.toHaveBeenCalled();
  });
});

describe("DELETE /card/:id", () => {
  it("deletes the user's own card", async () => {
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "alice" });
    Card.deleteOne.mockResolvedValue({});

    const res = await request(app).delete(`/card/${CARD_ID}`).set("Authorization", authHeader("alice"));

    expect(res.status).toBe(200);
    expect(Card.deleteOne).toHaveBeenCalledWith({ _id: CARD_ID });
  });

  it("refuses to delete another user's card with 403", async () => {
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "bob" });

    const res = await request(app).delete(`/card/${CARD_ID}`).set("Authorization", authHeader("alice"));

    expect(res.status).toBe(403);
    expect(Card.deleteOne).not.toHaveBeenCalled();
  });

  it("lets an admin delete another user's card", async () => {
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "bob" });
    Card.deleteOne.mockResolvedValue({});

    const res = await request(app)
      .delete(`/card/${CARD_ID}`)
      .set("Authorization", authHeader("alice", undefined, "admin"));

    expect(res.status).toBe(200);
    expect(Card.deleteOne).toHaveBeenCalledWith({ _id: CARD_ID });
  });

  it("lets an admin edit another user's card without changing the author", async () => {
    const save = jest.fn().mockResolvedValue({});
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "bob", ...validCard, save });

    const res = await request(app)
      .put(`/card/${CARD_ID}`)
      .set("Authorization", authHeader("alice", undefined, "admin"))
      .send({ ...validCard, comment: "Fixed by admin" });

    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalled();
    expect(res.body).toMatchObject({ comment: "Fixed by admin", username: "bob" });
  });

  it("treats a token without a role claim as a normal user", async () => {
    Card.findById.mockResolvedValue({ _id: CARD_ID, username: "bob" });
    const legacyToken = jwt.sign({ id: USER_ID, username: "alice" }, process.env.JWT_SECRET, { expiresIn: "15m" });

    const res = await request(app).delete(`/card/${CARD_ID}`).set("Authorization", `Bearer ${legacyToken}`);

    expect(res.status).toBe(403);
    expect(Card.deleteOne).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing card", async () => {
    Card.findById.mockResolvedValue(null);

    const res = await request(app).delete(`/card/${CARD_ID}`).set("Authorization", authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).delete("/card/not-an-id").set("Authorization", authHeader());

    expect(res.status).toBe(400);
  });
});
