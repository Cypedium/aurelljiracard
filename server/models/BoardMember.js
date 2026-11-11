const mongoose = require('mongoose');
const { ROLES, ADMIN_ROLE } = require('../utils/role');

// A user's role on a board (Postgres: board_members): the owner is "admin" (lists, issue types,
// any card), collaborators are "user". Unrelated to the global User.role
const boardMemberSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ROLES, required: true }
}, { timestamps: true });

boardMemberSchema.index({ boardId: 1, userId: 1 }, { unique: true });
boardMemberSchema.index({ userId: 1 });

// Admin (the owner) first, then by name
const byRoleThen = (field) => (a, b) =>
  (a.role === ADMIN_ROLE ? 0 : 1) - (b.role === ADMIN_ROLE ? 0 : 1) || a[field].localeCompare(b[field]);

// The user's boards as GET /board returns them: { _id, name, owner, role }, their own board first
boardMemberSchema.statics.boardsOf = async function (userId) {
  const memberships = await this.find({ userId })
    .populate({ path: 'boardId', select: 'ownerId', populate: { path: 'ownerId', select: 'username' } })
    .lean();
  return memberships
    // A board whose owner was deleted in between
    .filter((m) => m.boardId?.ownerId)
    .map((m) => {
      const owner = m.boardId.ownerId.username;
      return { _id: String(m.boardId._id), name: `${owner}'s board`, owner, role: m.role };
    })
    .sort(byRoleThen('owner'));
};

// The board's members as GET /board/:id/member returns them: { _id (user id), username, pictureUrl, role }
boardMemberSchema.statics.membersOf = async function (boardId) {
  const members = await this.find({ boardId }).populate({ path: 'userId', select: 'username pictureUrl' }).lean();
  return members
    .filter((m) => m.userId)
    .map((m) => ({ _id: String(m.userId._id), username: m.userId.username, pictureUrl: m.userId.pictureUrl, role: m.role }))
    .sort(byRoleThen('username'));
};

module.exports = mongoose.model('BoardMember', boardMemberSchema);
