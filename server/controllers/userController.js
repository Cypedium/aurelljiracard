// server/controllers/userController.js
const User = require("../models/User");
const Card = require("../models/Card");
const { isNonEmptyString, isObjectId } = require("../utils/validate");
const { isColumnKey } = require("../utils/cardStatus");
const { ADMIN_ROLE, ROLES } = require("../utils/role");
const { presence } = require("../utils/presence");
const {
  USERNAME_MAX_LENGTH,
  USERNAME_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  RUDE_USERNAME_MESSAGE,
  isRudeUsername,
  sameUsername,
  usernameIgnoreCase,
} = require("../utils/username");
const DUPLICATE_KEY_ERROR = 11000;

const MIN_COLS = 1;
const MAX_COLS = 12;
const HEADER_TITLE_MAX_LENGTH = 50;
// Must match HEX_COLOR in frontend/app/utils/boardLayout.ts and server-java LayoutRequest
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const HEADER_COLOR_MESSAGE = "Header color must be a hex color like #eed7fc.";

// Legacy: column names and colours are shared now (controllers/columnController.js);
// the frontend no longer sends headers, but older clients may
const isValidHeader = (h) =>
  h !== null &&
  typeof h === "object" &&
  isColumnKey(h.key) &&
  isNonEmptyString(h.title, HEADER_TITLE_MAX_LENGTH);

// Color is optional; null or missing means the default list color
const isValidHeaderColor = (h) =>
  h.color === undefined || h.color === null || (typeof h.color === "string" && HEX_COLOR.test(h.color));

const CARD_POSITION_MESSAGE = "Each saved card position needs a valid list key as status.";
const isValidCardPosition = (c) =>
  c !== null && typeof c === "object" && (c.status === undefined || isColumnKey(c.status));

const toHeader = ({ key, title, color }) => ({
  key,
  title: title.trim(),
  ...(color ? { color: color.toLowerCase() } : {})
});

// GET ALL USERS (admins also see who is online and when each user was last active)
exports.getAll = async (req, res) => {
  try {
    if (req.user.role !== ADMIN_ROLE) {
      const users = await User.find({}, "username pictureUrl role").lean();
      return res.status(200).json(users);
    }
    const users = await User.find({}, "username pictureUrl role lastActiveAt loggedOutAt").lean();
    const now = Date.now();
    res.status(200).json(
      users.map(({ lastActiveAt, loggedOutAt, ...user }) => ({ ...user, ...presence({ lastActiveAt, loggedOutAt }, now) }))
    );
  } catch (error) {
    console.error("Fetch users error:", error.message);
    res.status(500).json({ message: "Could not retrieve users." });
  }
};

// GET USERNAMES ONLY
exports.Usernames = async (req, res) => {
  try {
    const users = await User.find({}, "username").lean();
    const usernames = users.map(user => user.username);
    res.status(200).json(usernames);
  } catch (error) {
    console.error("Fetch usernames error:", error.message);
    res.status(500).json({ message: "Could not retrieve usernames." });
  }
};

// ⭐ GET USER LAYOUT
exports.getLayout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "layout").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(user.layout);
  } catch (error) {
    console.error("Get layout error:", error.message);
    res.status(500).json({ message: "Could not retrieve layout." });
  }
};

// ⭐ UPDATE USER LAYOUT
exports.updateLayout = async (req, res) => {
  const { cols, headers, cards } = req.body;

  if (cols !== undefined && (!Number.isInteger(cols) || cols < MIN_COLS || cols > MAX_COLS)) {
    return res.status(400).json({ message: `cols must be an integer between ${MIN_COLS} and ${MAX_COLS}.` });
  }
  if ((headers !== undefined && !Array.isArray(headers)) || (cards !== undefined && !Array.isArray(cards))) {
    return res.status(400).json({ message: "headers and cards must be arrays." });
  }
  if (headers !== undefined && !headers.every(isValidHeader)) {
    return res.status(400).json({
      message: `Each header needs a valid key and a title (max ${HEADER_TITLE_MAX_LENGTH} characters).`
    });
  }
  if (headers !== undefined && !headers.every(isValidHeaderColor)) {
    return res.status(400).json({ message: HEADER_COLOR_MESSAGE });
  }
  // A saved card position may name its list (status), so it survives lists being moved
  if (cards !== undefined && !cards.every(isValidCardPosition)) {
    return res.status(400).json({ message: CARD_POSITION_MESSAGE });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.layout = {
      cols: cols ?? user.layout.cols,
      headers: headers ? headers.map(toHeader) : user.layout.headers,
      cards: cards ?? user.layout.cards
    };

    await user.save();

    res.status(200).json({ message: "Layout updated successfully." });
  } catch (error) {
    console.error("Update layout error:", error.message);
    res.status(500).json({ message: "Failed to update layout." });
  }
};

// ⭐ ADMIN: rename and/or change role. Either change logs the user out everywhere
// (their tokens carry the old name and role); their cards follow the new name.
exports.update = async (req, res) => {
  const { id } = req.params;
  const { username, role } = req.body;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id." });
  }
  if (username !== undefined && !isNonEmptyString(username, USERNAME_MAX_LENGTH)) {
    return res.status(400).json({ message: USERNAME_MESSAGE });
  }
  if (username !== undefined && isRudeUsername(username)) {
    return res.status(400).json({ message: RUDE_USERNAME_MESSAGE });
  }
  if (role !== undefined && (typeof role !== "string" || !ROLES.includes(role))) {
    return res.status(400).json({ message: `Role must be one of: ${ROLES.join(", ")}.` });
  }
  // Keeps at least one admin: the caller is always an admin
  if (id === req.user.id && role !== undefined && role !== ADMIN_ROLE) {
    return res.status(400).json({ message: "You cannot remove your own admin role." });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const oldUsername = user.username;
    const renamed = username !== undefined && username !== oldUsername;
    const roleChanged = role !== undefined && role !== user.role;

    // Only changing the casing of the user's own name ("mike" → "Mike") is not a conflict
    if (renamed && !sameUsername(username, oldUsername) && (await User.exists({ username: usernameIgnoreCase(username) }))) {
      return res.status(409).json({ message: USERNAME_TAKEN_MESSAGE });
    }
    if (renamed) user.username = username;
    if (roleChanged) user.role = role;
    if (renamed || roleChanged) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      await user.save();
    }
    if (renamed) {
      await Card.updateMany({ username: oldUsername }, { username });
      await Card.updateMany({ assignee: oldUsername }, { assignee: username });
    }

    res.status(200).json({ _id: user._id, username: user.username, pictureUrl: user.pictureUrl, role: user.role });
  } catch (error) {
    // Another request took the name in between
    if (error.code === DUPLICATE_KEY_ERROR) {
      return res.status(409).json({ message: USERNAME_TAKEN_MESSAGE });
    }
    console.error("Update user error:", error.message);
    res.status(500).json({ message: "Could not update user." });
  }
};

// ⭐ ADMIN: delete a user without cards; cards assigned to them become unassigned
exports.remove = async (req, res) => {
  const { id } = req.params;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id." });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: "You cannot delete yourself." });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (await Card.exists({ username: user.username })) {
      return res.status(409).json({ message: "This user still has cards. Delete them first." });
    }
    await Card.updateMany({ assignee: user.username }, { assignee: null });
    await User.deleteOne({ _id: id });
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({ message: "Could not delete user." });
  }
};

// ⭐ ADMIN: revoke all refresh tokens; the user must log in again within 15 min and shows as offline
exports.revokeSessions = async (req, res) => {
  const { id } = req.params;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const result = await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 }, $set: { loggedOutAt: new Date() } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ message: "User logged out from all sessions." });
  } catch (error) {
    console.error("Revoke sessions error:", error.message);
    res.status(500).json({ message: "Could not log out user." });
  }
};
