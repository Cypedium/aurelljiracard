// server/controllers/cardController.js
const Card = require("../models/Card");
const { isNonEmptyString, isObjectId } = require("../utils/validate");
const { CARD_STATUSES } = require("../utils/cardStatus");
const { CARD_TYPES } = require("../utils/cardType");

const COMMENT_MAX_LENGTH = 2000;
const PRODUCT_ID_MAX_LENGTH = 200;
const DUPLICATE_KEY_MESSAGE = "Issue key already exists.";
const DUPLICATE_KEY_ERROR = 11000;

exports.getAll = async (req, res) => {
  try {
    const cards = await Card.find().sort({ submittedAt: -1 }).lean();
    res.status(200).json(cards);
  } catch (error) {
    console.error("Fetch cards error:", error.message);
    res.status(500).json({ message: "Could not retrieve cards." });
  }
};

// Returns an error message, or null when the card fields are valid
const validateCardFields = ({ rating, comment, productId, type }) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be an integer between 1 and 5.";
  }
  if (!isNonEmptyString(comment, COMMENT_MAX_LENGTH)) {
    return `Summary is required (max ${COMMENT_MAX_LENGTH} characters).`;
  }
  if (!isNonEmptyString(productId, PRODUCT_ID_MAX_LENGTH)) {
    return `Issue key is required (max ${PRODUCT_ID_MAX_LENGTH} characters).`;
  }
  if (type !== undefined && (typeof type !== "string" || !CARD_TYPES.includes(type))) {
    return `Type must be one of: ${CARD_TYPES.join(", ")}.`;
  }
  return null;
};

exports.create = async (req, res) => {
  const { rating, comment, productId, status, type } = req.body;

  const invalid = validateCardFields(req.body);
  if (invalid) {
    return res.status(400).json({ message: invalid });
  }
  // Optional: lets the board create a card directly in a column
  if (status !== undefined && (typeof status !== "string" || !CARD_STATUSES.includes(status))) {
    return res.status(400).json({ message: `Status must be one of: ${CARD_STATUSES.join(", ")}.` });
  }

  try {
    if (await Card.exists({ productId })) {
      return res.status(409).json({ message: DUPLICATE_KEY_MESSAGE });
    }
    // Author always comes from the verified token, never from the request body.
    // submittedAt is always today (schema default), never from the body.
    const newCard = new Card({ rating, comment, productId, username: req.user.username, status, type });
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
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
    if (card.username !== req.user.username) {
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

// Any logged-in user may move a card between columns, like in Jira
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isObjectId(id)) {
    return res.status(400).json({ message: "Invalid card id." });
  }
  if (typeof status !== "string" || !CARD_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${CARD_STATUSES.join(", ")}.` });
  }

  try {
    const card = await Card.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!card) {
      return res.status(404).json({ message: "Card not found." });
    }
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
    if (card.username !== req.user.username) {
      return res.status(403).json({ message: "You can only delete your own card." });
    }

    await Card.deleteOne({ _id: id });
    res.status(200).json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Delete card error:", error.message);
    res.status(500).json({ message: "Could not delete card." });
  }
};
