const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

router.get("/", auth, userController.getAll);
router.get("/usernames", auth, userController.Usernames);

router.get("/layout", auth, userController.getLayout);
router.put("/layout", auth, userController.updateLayout);

// Admin: rename, change role, delete, or log a user out everywhere
router.patch("/:id", auth, requireAdmin, userController.update);
router.delete("/:id", auth, requireAdmin, userController.remove);
router.post("/:id/logout", auth, requireAdmin, userController.revokeSessions);

module.exports = router;
