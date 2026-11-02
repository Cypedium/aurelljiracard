// server/middleware/requireAdmin.js
// Use after authMiddleware: only admins (role claim in the access token) may continue
const { ADMIN_ROLE } = require("../utils/role");

module.exports = (req, res, next) => {
  if (req.user?.role !== ADMIN_ROLE) {
    return res.status(403).json({ message: "Admins only." });
  }
  next();
};
