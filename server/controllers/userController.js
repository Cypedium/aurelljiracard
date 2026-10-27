// server/controllers/userController.js
const User = require("../models/User");
const { isNonEmptyString } = require("../utils/validate");
const { CARD_STATUSES } = require("../utils/cardStatus");

const MIN_COLS = 1;
const MAX_COLS = 12;
const HEADER_TITLE_MAX_LENGTH = 50;
// Must match HEX_COLOR in frontend/app/utils/boardLayout.ts and server-java LayoutRequest
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const HEADER_COLOR_MESSAGE = "Header color must be a hex color like #eed7fc.";

// Column names are per user; each header must name a board column
const isValidHeader = (h) =>
  h !== null &&
  typeof h === "object" &&
  CARD_STATUSES.includes(h.key) &&
  isNonEmptyString(h.title, HEADER_TITLE_MAX_LENGTH);

// Color is optional; null or missing means the default list color
const isValidHeaderColor = (h) =>
  h.color === undefined || h.color === null || (typeof h.color === "string" && HEX_COLOR.test(h.color));

const toHeader = ({ key, title, color }) => ({
  key,
  title: title.trim(),
  ...(color ? { color: color.toLowerCase() } : {})
});

// GET ALL USERS
exports.getAll = async (req, res) => {
  try {
    const users = await User.find({}, "username pictureUrl").lean();
    res.status(200).json(users);
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
