// routes/board.js
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const auth = require("../middleware/authMiddleware");
const { requireMember, requireBoardAdmin } = require("../middleware/boardAccess");
const cardRoutes = require("./card");
const columnRoutes = require("./column");
const issueTypeRoutes = require("./issueType");

// Mounted at /board in app.js. GET /board: the caller's boards (their own first)
router.get("/", auth, boardController.getMine);

// Everything under a board: members only (404 otherwise); sets req.boardId and req.boardRole
router.use("/:boardId", auth, requireMember);
router.use("/:boardId/card", cardRoutes);
router.use("/:boardId/column", columnRoutes);
router.use("/:boardId/issue-type", issueTypeRoutes);

// Board admin: a new invite link (the old one stops working), or no link
router.post("/:boardId/invite", requireBoardAdmin, boardController.createInvite);
router.delete("/:boardId/invite", requireBoardAdmin, boardController.deleteInvite);

router.get("/:boardId/member", boardController.getMembers);
// The board admin removes a collaborator, or a collaborator leaves (rules in the controller)
router.delete("/:boardId/member/:userId", boardController.removeMember);

module.exports = router;
