// server/middleware/boardAccess.js
// Use after authMiddleware on /board/:boardId/... (Java: BoardService.requireMember / requireAdmin).
// The board role is read from the database on every request, so removing a collaborator works at once.
const BoardMember = require("../models/BoardMember");
const { isObjectId } = require("../utils/validate");
const { ADMIN_ROLE } = require("../utils/role");

// Non-members get 404, so board ids don't reveal that a board exists. Sets req.boardId and req.boardRole
exports.requireMember = async (req, res, next) => {
  const { boardId } = req.params;
  if (!isObjectId(boardId)) {
    return res.status(400).json({ message: "Invalid board id." });
  }
  try {
    const member = await BoardMember.findOne({ boardId, userId: req.user.id }).lean();
    if (!member) {
      return res.status(404).json({ message: "Board not found." });
    }
    req.boardId = boardId;
    req.boardRole = member.role;
    next();
  } catch (error) {
    console.error("Board access error:", error.message);
    res.status(500).json({ message: "Could not open the board." });
  }
};

// Lists, issue types and invites: only the board admin (its owner)
exports.requireBoardAdmin = (req, res, next) => {
  if (req.boardRole !== ADMIN_ROLE) {
    return res.status(403).json({ message: "Board admins only." });
  }
  next();
};
