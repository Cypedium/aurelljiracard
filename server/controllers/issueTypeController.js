// server/controllers/issueTypeController.js
const IssueType = require("../models/IssueType");
const { isNonEmptyString } = require("../utils/validate");
const { ISSUE_TYPE_ICONS, issueTypeKeyFromLabel } = require("../utils/cardType");

// Must match ISSUE_TYPE_LABEL_MAX_LENGTH and HEX_COLOR in frontend/app/utils/cardType.ts
const LABEL_MAX_LENGTH = 30;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MAX_ISSUE_TYPES = 12;
const LABEL_MESSAGE = `Issue type name is required (max ${LABEL_MAX_LENGTH} characters).`;
const COLOR_MESSAGE = "Issue type color must be a hex color like #4bade8.";
const ICON_MESSAGE = `Icon must be one of: ${ISSUE_TYPE_ICONS.join(", ")}.`;
const DUPLICATE_KEY_ERROR = 11000;

const toIssueType = ({ key, label, color, icon, position }) => ({ key, label, color, icon, position });

exports.getAll = async (req, res) => {
  try {
    const types = await IssueType.listAll();
    res.status(200).json(types.map(toIssueType));
  } catch (error) {
    console.error("Fetch issue types error:", error.message);
    res.status(500).json({ message: "Could not retrieve issue types." });
  }
};

// Admin: adds an issue type at the end of the dropdown for everyone
exports.create = async (req, res) => {
  const { label, color, icon } = req.body;

  if (!isNonEmptyString(label, LABEL_MAX_LENGTH)) {
    return res.status(400).json({ message: LABEL_MESSAGE });
  }
  if (typeof color !== "string" || !HEX_COLOR.test(color)) {
    return res.status(400).json({ message: COLOR_MESSAGE });
  }
  if (typeof icon !== "string" || !ISSUE_TYPE_ICONS.includes(icon)) {
    return res.status(400).json({ message: ICON_MESSAGE });
  }

  try {
    const types = await IssueType.listAll();
    if (types.length >= MAX_ISSUE_TYPES) {
      return res.status(400).json({ message: `There can be at most ${MAX_ISSUE_TYPES} issue types.` });
    }
    const type = await IssueType.create({
      key: issueTypeKeyFromLabel(label, types.map((t) => t.key)),
      label: label.trim(),
      color: color.toLowerCase(),
      icon,
      position: Math.max(-1, ...types.map((t) => t.position)) + 1
    });
    res.status(201).json(toIssueType(type));
  } catch (error) {
    // Another admin added an issue type with the same name in between
    if (error.code === DUPLICATE_KEY_ERROR) {
      return res.status(409).json({ message: "An issue type with this name was just added. Try again." });
    }
    console.error("Create issue type error:", error.message);
    res.status(500).json({ message: "Could not add issue type." });
  }
};
