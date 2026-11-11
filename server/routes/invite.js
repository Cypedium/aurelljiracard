// routes/invite.js
const express = require("express");
const router = express.Router();
const boardController = require("../controllers/boardController");
const auth = require("../middleware/authMiddleware");

// Mounted at /invite in app.js. Any logged-in user joins the board behind the link as a collaborator
router.post("/:token", auth, boardController.join);

module.exports = router;
