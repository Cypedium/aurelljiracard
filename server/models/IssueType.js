const mongoose = require('mongoose');
const { DEFAULT_ISSUE_TYPES } = require('../utils/cardType');

// Issue type, shared by all users. Cards point at it with type = key
const issueTypeSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  // Icon background (#rrggbb, lowercase)
  color: { type: String, required: true },
  // One of ISSUE_TYPE_ICONS in utils/cardType.js
  icon: { type: String, required: true },
  // Order in the issue type dropdown
  position: { type: Number, required: true }
}, { timestamps: true });

// All issue types in dropdown order. The first call seeds the defaults;
// upserts make concurrent first calls safe
issueTypeSchema.statics.listAll = async function () {
  if ((await this.estimatedDocumentCount()) === 0) {
    await this.bulkWrite(
      DEFAULT_ISSUE_TYPES.map((type, position) => ({
        updateOne: { filter: { key: type.key }, update: { $setOnInsert: { ...type, position } }, upsert: true }
      }))
    );
  }
  return this.find().sort({ position: 1, key: 1 }).lean();
};

module.exports = mongoose.model('IssueType', issueTypeSchema);
