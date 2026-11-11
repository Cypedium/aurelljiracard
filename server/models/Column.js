const mongoose = require('mongoose');
const { DEFAULT_COLUMNS } = require('../utils/cardStatus');

// A list on one board, seen by its members. Cards on the board point at it with status = key
const columnSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  // List colour (#rrggbb, lowercase); null = the default colour
  color: { type: String, default: null },
  // Order on the board, left to right
  position: { type: Number, required: true }
}, { timestamps: true });

// Keys are unique per board
columnSchema.index({ boardId: 1, key: 1 }, { unique: true });

// The board's columns in board order. The first call for a board seeds the default columns;
// upserts make concurrent first calls safe
columnSchema.statics.listAll = async function (boardId) {
  if ((await this.countDocuments({ boardId })) === 0) {
    await this.bulkWrite(
      DEFAULT_COLUMNS.map((column, position) => ({
        updateOne: { filter: { boardId, key: column.key }, update: { $setOnInsert: { ...column, position } }, upsert: true }
      }))
    );
  }
  return this.find({ boardId }).sort({ position: 1, key: 1 }).lean();
};

module.exports = mongoose.model('Column', columnSchema);
