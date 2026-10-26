jest.mock("../models/Card", () => {
  const Card = jest.fn();
  Card.find = jest.fn();
  Card.findById = jest.fn();
  Card.findByIdAndUpdate = jest.fn();
  Card.deleteOne = jest.fn();
  return Card;
});

const request = require("supertest");
const app = require("../app");
const Card = require("../models/Card");
const { authHeader, query } = require("./helpers");

const CARD_ID = "64c000000000000000000001";
const validCard = { rating: 4, comment: "Looks good", productId: "AUR-1" };

beforeEach(() => {
  jest.clearAllMocks();
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

  it.each([
    [{ ...validCard, status: "archived" }],
    [{ ...validCard, status: { $ne: null } }],
    [{ ...validCard, rating: 0 }],
    [{ ...validCard, rating: "5" }],
    [{ ...validCard, comment: "" }],
    [{ ...validCard, productId: { $ne: null } }],
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
  it("lets any logged-in user move a card and returns it", async () => {
    Card.findByIdAndUpdate.mockReturnValue(query({ _id: CARD_ID, username: "bob", status: "done" }));

    const res = await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader("alice"))
      .send({ status: "done" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("done");
    expect(Card.findByIdAndUpdate).toHaveBeenCalledWith(CARD_ID, { status: "done" }, expect.any(Object));
  });

  it("only updates the status, ignoring other fields in the body", async () => {
    Card.findByIdAndUpdate.mockReturnValue(query({ _id: CARD_ID, status: "test" }));

    await request(app)
      .patch(`/card/${CARD_ID}/status`)
      .set("Authorization", authHeader())
      .send({ status: "test", comment: "hijack", username: "mallory" });

    expect(Card.findByIdAndUpdate.mock.calls[0][1]).toEqual({ status: "test" });
  });

  it("returns 404 for a missing card", async () => {
    Card.findByIdAndUpdate.mockReturnValue(query(null));

    const res = await request(app).patch(`/card/${CARD_ID}/status`).set("Authorization", authHeader()).send({ status: "todo" });

    expect(res.status).toBe(404);
  });

  it.each([
    ["an unknown status", CARD_ID, { status: "archived" }],
    ["a non-string status", CARD_ID, { status: { $ne: null } }],
    ["a missing status", CARD_ID, {}],
    ["a malformed id", "not-an-id", { status: "todo" }]
  ])("returns 400 for %s", async (_name, id, body) => {
    const res = await request(app).patch(`/card/${id}/status`).set("Authorization", authHeader()).send(body);

    expect(res.status).toBe(400);
    expect(Card.findByIdAndUpdate).not.toHaveBeenCalled();
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
