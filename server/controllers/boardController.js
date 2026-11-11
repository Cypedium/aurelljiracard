// server/controllers/boardController.js
// Boards, their members and invite links. Must match server-java BoardService.
const crypto = require("crypto");
const Board = require("../models/Board");
const BoardMember = require("../models/BoardMember");
const { isObjectId } = require("../utils/validate");
const { ADMIN_ROLE, DEFAULT_ROLE } = require("../utils/role");

const TOKEN_BYTES = 32;
const TOKEN_MAX_LENGTH = 100;
const INVITE_INVALID_MESSAGE = "This invite link is invalid or has been turned off.";

// Only the hash is stored, so a database leak doesn't leak working links
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// The user's boards, their own first. Creates their own board on first use (Board.ensureFor)
exports.getMine = async (req, res) => {
  try {
    await Board.ensureFor(req.user.id);
    res.status(200).json(await BoardMember.boardsOf(req.user.id));
  } catch (error) {
    console.error("Fetch boards error:", error.message);
    res.status(500).json({ message: "Could not retrieve boards." });
  }
};

// Board admin: a new invite link; the old one stops working. The token is returned only here
exports.createInvite = async (req, res) => {
  try {
    const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
    await Board.updateOne({ _id: req.boardId }, { inviteTokenHash: hashToken(token) });
    res.status(201).json({ token });
  } catch (error) {
    console.error("Create invite error:", error.message);
    res.status(500).json({ message: "Could not create the invite link." });
  }
};

// Board admin: turns the invite link off. Collaborators who already joined stay
exports.deleteInvite = async (req, res) => {
  try {
    await Board.updateOne({ _id: req.boardId }, { inviteTokenHash: null });
    res.status(200).json({ message: "Invite link turned off." });
  } catch (error) {
    console.error("Delete invite error:", error.message);
    res.status(500).json({ message: "Could not turn the invite link off." });
  }
};

// Any logged-in user: joins the board as a collaborator. Joining again (or your own board) changes nothing
exports.join = async (req, res) => {
  const { token } = req.params;
  if (typeof token !== "string" || !token.trim() || token.length > TOKEN_MAX_LENGTH) {
    return res.status(404).json({ message: INVITE_INVALID_MESSAGE });
  }
  try {
    const board = await Board.findOne({ inviteTokenHash: hashToken(token) }).lean();
    if (!board) {
      return res.status(404).json({ message: INVITE_INVALID_MESSAGE });
    }
    await BoardMember.updateOne(
      { boardId: board._id, userId: req.user.id },
      { $setOnInsert: { role: DEFAULT_ROLE } },
      { upsert: true }
    );
    const joined = (await BoardMember.boardsOf(req.user.id)).find((b) => b._id === String(board._id));
    if (!joined) {
      return res.status(404).json({ message: "Board not found." });
    }
    res.status(200).json(joined);
  } catch (error) {
    // Two joins at once: the second upsert hits the unique index, the first one added the member
    if (error.code === 11000) {
      return res.status(409).json({ message: "You joined this board already." });
    }
    console.error("Join board error:", error.message);
    res.status(500).json({ message: "Could not join the board." });
  }
};

// Members: everyone on the board, the admin first
exports.getMembers = async (req, res) => {
  try {
    res.status(200).json(await BoardMember.membersOf(req.boardId));
  } catch (error) {
    console.error("Fetch members error:", error.message);
    res.status(500).json({ message: "Could not retrieve members." });
  }
};

// The board admin removes a collaborator, or a collaborator leaves. The owner cannot leave their own board
exports.removeMember = async (req, res) => {
  const { userId } = req.params;
  if (!isObjectId(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }
  const isSelf = userId === req.user.id;
  if (isSelf && req.boardRole === ADMIN_ROLE) {
    return res.status(400).json({ message: "You cannot leave your own board." });
  }
  if (!isSelf && req.boardRole !== ADMIN_ROLE) {
    return res.status(403).json({ message: "Board admins only." });
  }
  try {
    const { deletedCount } = await BoardMember.deleteOne({ boardId: req.boardId, userId });
    if (!deletedCount) {
      return res.status(404).json({ message: "Member not found." });
    }
    res.status(200).json({ message: "Member removed." });
  } catch (error) {
    console.error("Remove member error:", error.message);
    res.status(500).json({ message: "Could not remove the member." });
  }
};
