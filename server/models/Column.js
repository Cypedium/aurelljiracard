const mongoose = require('mongoose');
const { DEFAULT_COLUMNS } = require('../utils/cardStatus');

// Board column (list), shared by all users. Cards point at it with status = key
const columnSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  // List colour (#rrggbb, lowercase); null = the default colour
  color: { type: String, default: null },
  // Order on the board, left to right
  position: { type: Number, required: true }
}, { timestamps: true });

// All columns in board order. The first call seeds the default columns;
// upserts make concurrent first calls safe
columnSchema.statics.listAll = async function () {
  if ((await this.estimatedDocumentCount()) === 0) {
    await this.bulkWrite(
      DEFAULT_COLUMNS.map((column, position) => ({
        updateOne: { filter: { key: column.key }, update: { $setOnInsert: { ...column, position } }, upsert: true }
      }))
    );
  }
  return this.find().sort({ position: 1, key: 1 }).lean();
};

module.exports = mongoose.model('Column', columnSchema);
