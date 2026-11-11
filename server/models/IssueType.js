const mongoose = require('mongoose');
const { DEFAULT_ISSUE_TYPES } = require('../utils/cardType');

// An issue type on one board. Cards on the board point at it with type = key
const issueTypeSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  // Icon background (#rrggbb, lowercase)
  color: { type: String, required: true },
  // One of ISSUE_TYPE_ICONS in utils/cardType.js
  icon: { type: String, required: true },
  // Order in the issue type dropdown
  position: { type: Number, required: true }
}, { timestamps: true });

// Keys are unique per board
issueTypeSchema.index({ boardId: 1, key: 1 }, { unique: true });

// The board's issue types in dropdown order. The first call for a board seeds the defaults;
// upserts make concurrent first calls safe
issueTypeSchema.statics.listAll = async function (boardId) {
  if ((await this.countDocuments({ boardId })) === 0) {
    await this.bulkWrite(
      DEFAULT_ISSUE_TYPES.map((type, position) => ({
        updateOne: { filter: { boardId, key: type.key }, update: { $setOnInsert: { ...type, position } }, upsert: true }
      }))
    );
  }
  return this.find({ boardId }).sort({ position: 1, key: 1 }).lean();
};

module.exports = mongoose.model('IssueType', issueTypeSchema);
