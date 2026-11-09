// server/controllers/cardController.js
const Card = require("../models/Card");
const Column = require("../models/Column");
const IssueType = require("../models/IssueType");
const { isNonEmptyString, isObjectId } = require("../utils/validate");
const { BACKLOG_STATUS } = require("../utils/cardStatus");
const { ADMIN_ROLE } = require("../utils/role");

const COMMENT_MAX_LENGTH = 2000;
// Issue key in Jira format, e.g. MA-100 (same rule as frontend/app/utils/cardForm.ts)
const PRODUCT_ID_MAX_LENGTH = 6;
const PRODUCT_ID_PATTERN = /^[A-Za-z]+-[0-9]+$/;
const PRODUCT_ID_MESSAGE = `Issue key must look like MA-100: letters, a hyphen and digits (max ${PRODUCT_ID_MAX_LENGTH} characters).`;
const DUPLICATE_KEY_MESSAGE = "Issue key already exists.";
const DUPLICATE_KEY_ERROR = 11000;

// Valid statuses: the board columns' keys, then the backlog
const cardStatuses = async () => [...(await Column.listAll()).map((c) => c.key), BACKLOG_STATUS];
const statusMessage = (statuses) => `Status must be one of: ${statuses.join(", ")}.`;

// Optional type: an issue type's key. Returns an error message, or null when valid or missing
const checkType = async (type) => {
  if (type === undefined) return null;
  const types = (await IssueType.listAll()).map((t) => t.key);
  return typeof type === "string" && types.includes(type) ? null : `Type must be one of: ${types.join(", ")}.`;
};

exports.getAll = async (req, res) => {
  try {
    const cards = await Card.find().sort({ submittedAt: -1 }).lean();
    res.status(200).json(cards);
  } catch (error) {
    console.error("Fetch cards error:", error.message);
    res.status(500).json({ message: "Could not retrieve cards." });
  }
};

// Returns an error message, or null when the card fields are valid (type: see checkType)
const validateCardFields = ({ rating, comment, productId }) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be an integer between 1 and 5.";
  }
  if (!isNonEmptyString(comment, COMMENT_MAX_LENGTH)) {
    return `Summary is required (max ${COMMENT_MAX_LENGTH} characters).`;
  }
  if (!isNonEmptyString(productId, PRODUCT_ID_MAX_LENGTH) || !PRODUCT_ID_PATTERN.test(productId)) {
    return PRODUCT_ID_MESSAGE;
  }
  return null;
};

exports.create = async (req, res) => {
  const { rating, comment, productId, status, type } = req.body;

  const invalid = validateCardFields(req.body);
  if (invalid) {
    return res.status(400).json({ message: invalid });
  }

  try {
    const invalidType = await checkType(type);
    if (invalidType) {
      return res.status(400).json({ message: invalidType });
    }
    // Optional: lets the board create a card directly in a column
    if (status !== undefined) {
      const statuses = await cardStatuses();
      if (typeof status !== "string" || !statuses.includes(status)) {
        return res.status(400).json({ message: statusMessage(statuses) });
      }
    }
    if (await Card.exists({ productId })) {
      return res.status(409).json({ message: DUPLICATE_KEY_MESSAGE });
    }
    // Author always comes from the verified token, never from the request body.
    // submittedAt is always today (schema default), never from the body.
    // Cards on the board are assigned to their author; backlog cards to no one
    const assignee = status === BACKLOG_STATUS ? null : req.user.username;
    const newCard = new Card({ rating, comment, productId, username: req.user.username, assignee, status, type });
    await newCard.save();
    res.status(201).json({ message: "Card saved successfully!" });
  } catch (error) {
    // Another request saved the same issue key in between
    if (error.code === DUPLICATE_KEY_ERROR) {
      return res.status(409).json({ message: DUPLICATE_KEY_MESSAGE });
    }
    console.error("Save card error:", error.message);
    res.status(500).json({ message: "Failed to save card." });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { rating, comment, productId, type } = req.body;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid card id." });
  }
  const invalid = validateCardFields(req.body);
  if (invalid) {
    return res.status(400).json({ message: invalid });
  }

  try {
    const invalidType = await checkType(type);
    if (invalidType) {
      return res.status(400).json({ message: invalidType });
    }
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    // The author or an admin may edit; the author never changes
    if (card.username !== req.user.username && req.user.role !== ADMIN_ROLE) {
      return res.status(403).json({ message: "You can only edit your own card." });
    }
    // Keeping the card's own key is fine (no $ne: sanitizeFilter would neutralise it)
    const duplicate = await Card.exists({ productId });
    if (duplicate && String(duplicate._id) !== id) {
      return res.status(409).json({ message: DUPLICATE_KEY_MESSAGE });
    }

    // Author and creation date are never changed by an edit
    card.rating = rating;
    card.comment = comment;
    card.productId = productId;
    if (type !== undefined) card.type = type;
    await card.save();
    res.status(200).json(card);
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      return res.status(409).json({ message: DUPLICATE_KEY_MESSAGE });
    }
    console.error("Update card error:", error.message);
    res.status(500).json({ message: "Could not update card." });
  }
};

// Any logged-in user may move a card between columns, like in Jira.
// Taking a card from the backlog assigns it to the caller; moving it to the backlog unassigns it.
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid card id." });
  }

  try {
    const statuses = await cardStatuses();
    if (typeof status !== "string" || !statuses.includes(status)) {
      return res.status(400).json({ message: statusMessage(statuses) });
    }
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    if (status === BACKLOG_STATUS) {
      card.assignee = null;
    } else if (card.status === BACKLOG_STATUS) {
      card.assignee = req.user.username;
    }
    card.status = status;
    await card.save();
    res.status(200).json(card);
  } catch (error) {
    console.error("Update card status error:", error.message);
    res.status(500).json({ message: "Could not update card status." });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid card id." });
  }

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    // Admins may delete any card
    if (card.username !== req.user.username && req.user.role !== ADMIN_ROLE) {
      return res.status(403).json({ message: "You can only delete your own card." });
    }

    await Card.deleteOne({ _id: id });
    res.status(200).json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Delete card error:", error.message);
    res.status(500).json({ message: "Could not delete card." });
  }
};
