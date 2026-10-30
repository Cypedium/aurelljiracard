const mongoose = require('mongoose');
const { CARD_STATUSES, DEFAULT_CARD_STATUS } = require('../utils/cardStatus');
const { CARD_TYPES, DEFAULT_CARD_TYPE } = require('../utils/cardType');

const cardSchema = new mongoose.Schema({
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    // Issue key, unique across all cards
    productId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    // Board column, shared by all users
    status: { type: String, enum: CARD_STATUSES, default: DEFAULT_CARD_STATUS },
    // Issue type; cards created before types existed read as "task"
    type: { type: String, enum: CARD_TYPES, default: DEFAULT_CARD_TYPE }
});

module.exports = mongoose.model('Card', cardSchema);