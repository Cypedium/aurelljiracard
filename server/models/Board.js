const mongoose = require('mongoose');

// A user's board (Postgres: boards, V11__boards.sql). Every user owns one; others join it as
// collaborators through an invite link (models/BoardMember.js). The name shown is "<owner>'s board"
const boardSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // SHA-256 (hex) of the invite link's token; null = no link. The token itself is never stored
  inviteTokenHash: { type: String, default: null }
}, { timestamps: true });

// Unique among boards that have a link
boardSchema.index(
  { inviteTokenHash: 1 },
  { unique: true, partialFilterExpression: { inviteTokenHash: { $type: 'string' } } }
);

// The user's own board, created (with them as its admin) the first time. Lists and issue types are
// seeded on first read (Column.listAll, IssueType.listAll). Upserts make concurrent first calls safe
boardSchema.statics.ensureFor = async function (userId) {
  const BoardMember = mongoose.model('BoardMember');
  let board;
  try {
    board = await this.findOneAndUpdate(
      { ownerId: userId },
      { $setOnInsert: { ownerId: userId } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
  } catch (error) {
    // Another request created it in between
    if (error.code !== 11000) throw error;
    board = await this.findOne({ ownerId: userId }).lean();
  }
  await BoardMember.updateOne(
    { boardId: board._id, userId },
    { $setOnInsert: { role: 'admin' } },
    { upsert: true }
  ).catch((error) => {
    if (error.code !== 11000) throw error;
  });
  return board;
};

module.exports = mongoose.model('Board', boardSchema);
