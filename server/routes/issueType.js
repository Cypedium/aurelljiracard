// routes/issueType.js
const express = require("express");
const router = express.Router();
const issueTypeController = require("../controllers/issueTypeController");
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// Mounted at /issue-type in app.js. Issue types are shared: everyone reads them, admins add new ones
router.get("/", auth, issueTypeController.getAll);
router.post("/", auth, requireAdmin, issueTypeController.create);

module.exports = router;
