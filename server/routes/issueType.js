// routes/issueType.js
const express = require("express");
const router = express.Router();
const issueTypeController = require("../controllers/issueTypeController");
const { requireBoardAdmin } = require("../middleware/boardAccess");

// Mounted at /board/:boardId/issue-type in routes/board.js, after auth and requireMember.
// Members read the board's issue types, the board admin adds and deletes them
router.get("/", issueTypeController.getAll);
router.post("/", requireBoardAdmin, issueTypeController.create);
router.delete("/:key", requireBoardAdmin, issueTypeController.remove);

module.exports = router;
