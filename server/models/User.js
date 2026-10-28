const mongoose = require('mongoose');

const LayoutSchema = new mongoose.Schema({
  cols: { type: Number, default: 12 },
  headers: [
    {
      key: String,
      title: String,
      // Valfri listfärg (#rrggbb); saknas = standardfärgen
      color: String
    }
  ],
  cards: [
    {
      id: String,
      x: Number,
      y: Number,
      w: Number,
      h: Number,
      content: mongoose.Schema.Types.Mixed
    }
  ]
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  pictureUrl: { type: String, default: 'https://example.com/default-profile.png' },

  // Incremented on logout to revoke all outstanding refresh tokens
  tokenVersion: { type: Number, default: 0 },

  // Layout sparas direkt på användaren
  layout: {
    type: LayoutSchema,
    default: () => ({
      cols: 12,
      headers: [],
      cards: []
    })
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
