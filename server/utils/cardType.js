// server/utils/cardType.js
// Issue types are shared by all users and stored in models/IssueType.js; admins add new ones.
// Defaults, seeded when there are none; must match DEFAULT_ISSUE_TYPES in frontend/app/utils/cardType.ts
// and server-java V8__issue_types.sql
const { uniqueKeyFromTitle } = require("./cardStatus");

const DEFAULT_ISSUE_TYPES = [
  { key: "task", label: "Task", color: "#4bade8", icon: "check" },
  { key: "bug", label: "Bug", color: "#c9372c", icon: "bug" },
  { key: "doc", label: "Doc", color: "#8270db", icon: "doc" }
];

// Icons an issue type can have; must match ISSUE_TYPE_ICONS in frontend/app/utils/cardType.ts
// and IssueTypeRequest in server-java
const ISSUE_TYPE_ICONS = ["check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb"];

// A new issue type's key from its name ("User story" → "user-story"), unique among the taken keys
const issueTypeKeyFromLabel = (label, takenKeys) => uniqueKeyFromTitle(label, takenKeys, "type");

exports.DEFAULT_ISSUE_TYPES = DEFAULT_ISSUE_TYPES;
exports.DEFAULT_CARD_TYPE = "task";
exports.ISSUE_TYPE_ICONS = ISSUE_TYPE_ICONS;
exports.issueTypeKeyFromLabel = issueTypeKeyFromLabel;
