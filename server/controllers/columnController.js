// server/controllers/columnController.js
const Column = require("../models/Column");
const Card = require("../models/Card");
const { isNonEmptyString } = require("../utils/validate");
const { DEFAULT_CARD_STATUS, columnKeyFromTitle, isColumnKey } = require("../utils/cardStatus");

// Must match HEADER_TITLE_MAX_LENGTH and HEX_COLOR in frontend/app/utils/boardLayout.ts
const TITLE_MAX_LENGTH = 50;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_COLUMNS = 12;
const TITLE_MESSAGE = `List name is required (max ${TITLE_MAX_LENGTH} characters).`;
const COLOR_MESSAGE = "List color must be a hex color like #eed7fc.";
const DUPLICATE_KEY_ERROR = 11000;
const ORDER_MESSAGE = "List order must contain every list exactly once.";

// Every handler runs after requireMember (req.boardId); changes also after requireBoardAdmin
const toColumn = ({ key, title, color, position }) => ({ key, title, color: color ?? null, position });

// Returns an error message, or null when title and color are valid. color null or missing = default colour
const validateColumnFields = ({ title, color }) => {
  if (!isNonEmptyString(title, TITLE_MAX_LENGTH)) return TITLE_MESSAGE;
  if (color !== undefined && color !== null && (typeof color !== "string" || !HEX_COLOR.test(color))) {
    return COLOR_MESSAGE;
  }
  return null;
};

exports.getAll = async (req, res) => {
  try {
    const columns = await Column.listAll(req.boardId);
    res.status(200).json(columns.map(toColumn));
  } catch (error) {
    console.error("Fetch columns error:", error.message);
    res.status(500).json({ message: "Could not retrieve lists." });
  }
};

// Board admin: adds a list at the end of the board
exports.create = async (req, res) => {
  const { title, color } = req.body;

  const invalid = validateColumnFields(req.body);
  if (invalid) {
    return res.status(400).json({ message: invalid });
  }

  try {
    const columns = await Column.listAll(req.boardId);
    if (columns.length >= MAX_COLUMNS) {
      return res.status(400).json({ message: `The board can have at most ${MAX_COLUMNS} lists.` });
    }
    const column = await Column.create({
      boardId: req.boardId,
      key: columnKeyFromTitle(title, columns.map((c) => c.key)),
      title: title.trim(),
      color: color ? color.toLowerCase() : null,
      position: Math.max(-1, ...columns.map((c) => c.position)) + 1
    });
    res.status(201).json(toColumn(column));
  } catch (error) {
    // Another admin added a list with the same name in between
    if (error.code === DUPLICATE_KEY_ERROR) {
      return res.status(409).json({ message: "A list with this name was just added. Try again." });
    }
    console.error("Create column error:", error.message);
    res.status(500).json({ message: "Could not add list." });
  }
};

// Board admin: renames and/or recolours a list (replaces title and color)
exports.update = async (req, res) => {
  const { key } = req.params;
  const { title, color } = req.body;

  if (!isColumnKey(key)) {
    return res.status(400).json({ message: "Invalid list key." });
  }
  const invalid = validateColumnFields(req.body);
  if (invalid) {
    return res.status(400).json({ message: invalid });
  }

  try {
    // Seeds the default columns, so they can be renamed before anyone has opened the board
    await Column.listAll(req.boardId);
    const column = await Column.findOne({ boardId: req.boardId, key });
    if (!column) {
      return res.status(404).json({ message: "List not found." });
    }
    column.title = title.trim();
    column.color = color ? color.toLowerCase() : null;
    await column.save();
    res.status(200).json(toColumn(column));
  } catch (error) {
    console.error("Update column error:", error.message);
    res.status(500).json({ message: "Could not update list." });
  }
};

// Board admin: sets the order of all lists; keys must be every list exactly once
exports.reorder = async (req, res) => {
  const { keys } = req.body;

  if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string")) {
    return res.status(400).json({ message: ORDER_MESSAGE });
  }

  try {
    const columns = await Column.listAll(req.boardId);
    const byKey = new Map(columns.map((c) => [c.key, c]));
    if (keys.length !== columns.length || new Set(keys).size !== keys.length || !keys.every((key) => byKey.has(key))) {
      return res.status(400).json({ message: ORDER_MESSAGE });
    }
    await Column.bulkWrite(
      keys.map((key, position) => ({ updateOne: { filter: { boardId: req.boardId, key }, update: { $set: { position } } } }))
    );
    res.status(200).json(keys.map((key, position) => toColumn({ ...byKey.get(key), position })));
  } catch (error) {
    console.error("Reorder columns error:", error.message);
    res.status(500).json({ message: "Could not move the list." });
  }
};

// Board admin: removes an empty list. The default list stays: cards created without a status go there
exports.remove = async (req, res) => {
  const { key } = req.params;

  if (!isColumnKey(key)) {
    return res.status(400).json({ message: "Invalid list key." });
  }
  if (key === DEFAULT_CARD_STATUS) {
    return res.status(400).json({ message: "The default list cannot be deleted." });
  }

  try {
    const columns = await Column.listAll(req.boardId);
    if (!columns.some((c) => c.key === key)) {
      return res.status(404).json({ message: "List not found." });
    }
    if (await Card.exists({ boardId: req.boardId, status: key })) {
      return res.status(409).json({ message: "The list still has cards. Move or delete them first." });
    }
    await Column.deleteOne({ boardId: req.boardId, key });
    res.status(200).json({ message: "List deleted." });
  } catch (error) {
    console.error("Delete column error:", error.message);
    res.status(500).json({ message: "Could not delete list." });
  }
};
