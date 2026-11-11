// routes/column.js
const express = require("express");
const router = express.Router();
const columnController = require("../controllers/columnController");
const { requireBoardAdmin } = require("../middleware/boardAccess");

// Mounted at /board/:boardId/column in routes/board.js, after auth and requireMember.
// Members read the board's lists, the board admin changes them
router.get("/", columnController.getAll);
router.post("/", requireBoardAdmin, columnController.create);
// Order of all lists: { keys: [...] }
router.put("/", requireBoardAdmin, columnController.reorder);
router.put("/:key", requireBoardAdmin, columnController.update);
// Only empty lists; never the default list (todo)
router.delete("/:key", requireBoardAdmin, columnController.remove);

module.exports = router;
