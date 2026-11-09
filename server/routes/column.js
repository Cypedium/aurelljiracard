// routes/column.js
const express = require("express");
const router = express.Router();
const columnController = require("../controllers/columnController");
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// Mounted at /column in app.js. Lists are shared: everyone reads them, admins change them
router.get("/", auth, columnController.getAll);
router.post("/", auth, requireAdmin, columnController.create);
// Order of all lists: { keys: [...] }
router.put("/", auth, requireAdmin, columnController.reorder);
router.put("/:key", auth, requireAdmin, columnController.update);
// Only empty lists; never the default list (todo)
router.delete("/:key", auth, requireAdmin, columnController.remove);

module.exports = router;
