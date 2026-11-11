// routes/card.js
const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");

// Mounted at /board/:boardId/card in routes/board.js, after auth and requireMember
router.get("/", cardController.getAll);
router.post("/", cardController.create);
router.put("/:id", cardController.update);
router.patch("/:id/status", cardController.updateStatus);
router.delete("/:id", cardController.remove);

module.exports = router;
