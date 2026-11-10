const mongoose = require('mongoose');

// An issued refresh token (Postgres: refresh_tokens, V9__refresh_tokens.sql). Each one may be
// traded for new tokens once. A login starts a family; each refresh adds the next token to it,
// and reusing a token deletes the whole family (see authController.refresh)
const refreshTokenSchema = new mongoose.Schema({
  // The token's jti
  _id: { type: String },
  familyId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  // Set when the token is traded in; a second use means it was copied
  usedAt: { type: Date, default: null }
}, { versionKey: false });

// MongoDB removes tokens once they have expired
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
