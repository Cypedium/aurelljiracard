jest.mock("../models/Board", () => ({
  ensureFor: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock("../models/BoardMember", () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  boardsOf: jest.fn(),
  membersOf: jest.fn()
}));
jest.mock("../models/Card", () => ({ find: jest.fn() }));

const crypto = require("crypto");
const request = require("supertest");
const app = require("../app");
const Board = require("../models/Board");
const BoardMember = require("../models/BoardMember");
const Card = require("../models/Card");
const {
  authHeader, boardAdminHeader, mockMembership, query, BOARD_ID, BOARD_ADMIN_ID, USER_ID
} = require("./helpers");

const OTHER_BOARD = "64d000000000000000000002";
const sha256 = (token) => crypto.createHash("sha256").update(token).digest("hex");
const aliceBoards = [
  { _id: OTHER_BOARD, name: "alice's board", owner: "alice", role: "admin" },
  { _id: BOARD_ID, name: "owner's board", owner: "owner", role: "user" }
];

beforeEach(() => {
  jest.clearAllMocks();
  mockMembership(BoardMember);
  Board.ensureFor.mockResolvedValue({ _id: OTHER_BOARD });
  Board.updateOne.mockResolvedValue({ matchedCount: 1 });
  BoardMember.boardsOf.mockResolvedValue(aliceBoards);
  BoardMember.updateOne.mockResolvedValue({});
  BoardMember.deleteOne.mockResolvedValue({ deletedCount: 1 });
});

describe("auth guard", () => {
  it.each([
    ["get", "/board"],
    ["get", `/board/${BOARD_ID}/card`],
    ["get", `/board/${BOARD_ID}/member`],
    ["post", `/board/${BOARD_ID}/invite`],
    ["post", "/invite/some-token"]
  ])("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
  });

  it.each(["/card", "/column", "/issue-type"])("the old global path %s is gone", async (path) => {
    const res = await request(app).get(path).set("Authorization", authHeader());

    expect(res.status).toBe(404);
  });
});

describe("GET /board", () => {
  it("creates the caller's own board if needed and lists their boards", async () => {
    const res = await request(app).get("/board").set("Authorization", authHeader("alice"));

    expect(res.status).toBe(200);
    expect(Board.ensureFor).toHaveBeenCalledWith(USER_ID);
    expect(BoardMember.boardsOf).toHaveBeenCalledWith(USER_ID);
    expect(res.body).toEqual(aliceBoards);
  });
});

describe("board access", () => {
  it("returns 404 for a board the caller is not on, even for a site admin", async () => {
    BoardMember.findOne.mockReturnValue(query(null));
    Card.find.mockReturnValue(query([]));

    const res = await request(app)
      .get(`/board/${BOARD_ID}/card`)
      .set("Authorization", authHeader("boss", USER_ID, "admin"));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Board not found.");
    expect(Card.find).not.toHaveBeenCalled();
  });

  it("checks membership by the token's user id and board id", async () => {
    Card.find.mockReturnValue(query([]));

    const res = await request(app).get(`/board/${BOARD_ID}/card`).set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(BoardMember.findOne).toHaveBeenCalledWith({ boardId: BOARD_ID, userId: USER_ID });
    expect(Card.find).toHaveBeenCalledWith({ boardId: BOARD_ID });
  });

  it("returns 400 for a malformed board id", async () => {
    const res = await request(app).get("/board/not-a-board/card").set("Authorization", authHeader());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid board id.");
    expect(BoardMember.findOne).not.toHaveBeenCalled();
  });
});

describe("invite links", () => {
  it("lets the board admin create a link and stores only its hash", async () => {
    const res = await request(app).post(`/board/${BOARD_ID}/invite`).set("Authorization", boardAdminHeader());

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Board.updateOne).toHaveBeenCalledWith({ _id: BOARD_ID }, { inviteTokenHash: sha256(res.body.token) });
  });

  it("lets the board admin turn the link off", async () => {
    const res = await request(app).delete(`/board/${BOARD_ID}/invite`).set("Authorization", boardAdminHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Invite link turned off.");
    expect(Board.updateOne).toHaveBeenCalledWith({ _id: BOARD_ID }, { inviteTokenHash: null });
  });

  it.each([
    ["post", `/board/${BOARD_ID}/invite`],
    ["delete", `/board/${BOARD_ID}/invite`]
  ])("%s %s returns 403 for a collaborator", async (method, path) => {
    const res = await request(app)[method](path).set("Authorization", authHeader());

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Board admins only.");
    expect(Board.updateOne).not.toHaveBeenCalled();
  });

  it("joins the board behind a link as a collaborator", async () => {
    Board.findOne.mockReturnValue(query({ _id: BOARD_ID }));

    const res = await request(app).post("/invite/the-token").set("Authorization", authHeader("alice"));

    expect(res.status).toBe(200);
    expect(Board.findOne).toHaveBeenCalledWith({ inviteTokenHash: sha256("the-token") });
    // An upsert, so joining again (or your own board) keeps the role you have
    expect(BoardMember.updateOne).toHaveBeenCalledWith(
      { boardId: BOARD_ID, userId: USER_ID },
      { $setOnInsert: { role: "user" } },
      { upsert: true }
    );
    expect(res.body).toEqual(aliceBoards[1]);
  });

  it.each([
    ["an unknown token", "nope"],
    ["a token that is too long", "x".repeat(101)]
  ])("returns 404 for %s", async (_name, token) => {
    Board.findOne.mockReturnValue(query(null));

    const res = await request(app).post(`/invite/${token}`).set("Authorization", authHeader());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("This invite link is invalid or has been turned off.");
    expect(BoardMember.updateOne).not.toHaveBeenCalled();
  });
});

describe("members", () => {
  it("lists the board's members to any member", async () => {
    const members = [{ _id: BOARD_ADMIN_ID, username: "owner", role: "admin" }, { _id: USER_ID, username: "alice", role: "user" }];
    BoardMember.membersOf.mockResolvedValue(members);

    const res = await request(app).get(`/board/${BOARD_ID}/member`).set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(BoardMember.membersOf).toHaveBeenCalledWith(BOARD_ID);
    expect(res.body).toEqual(members);
  });

  it("lets the board admin remove a collaborator", async () => {
    const res = await request(app).delete(`/board/${BOARD_ID}/member/${USER_ID}`).set("Authorization", boardAdminHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Member removed.");
    expect(BoardMember.deleteOne).toHaveBeenCalledWith({ boardId: BOARD_ID, userId: USER_ID });
  });

  it("lets a collaborator leave", async () => {
    const res = await request(app).delete(`/board/${BOARD_ID}/member/${USER_ID}`).set("Authorization", authHeader());

    expect(res.status).toBe(200);
  });

  it("does not let a collaborator remove someone else", async () => {
    const res = await request(app)
      .delete(`/board/${BOARD_ID}/member/64b000000000000000000003`)
      .set("Authorization", authHeader());

    expect(res.status).toBe(403);
    expect(BoardMember.deleteOne).not.toHaveBeenCalled();
  });

  it("does not let the owner leave their own board", async () => {
    const res = await request(app)
      .delete(`/board/${BOARD_ID}/member/${BOARD_ADMIN_ID}`)
      .set("Authorization", boardAdminHeader());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You cannot leave your own board.");
  });

  it("returns 404 when the user is not a member", async () => {
    BoardMember.deleteOne.mockResolvedValue({ deletedCount: 0 });

    const res = await request(app)
      .delete(`/board/${BOARD_ID}/member/64b000000000000000000003`)
      .set("Authorization", boardAdminHeader());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Member not found.");
  });

  it("returns 400 for a malformed user id", async () => {
    const res = await request(app).delete(`/board/${BOARD_ID}/member/nope`).set("Authorization", boardAdminHeader());

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid user id.");
  });
});
