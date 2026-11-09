const mongoose = require('mongoose');
const { DEFAULT_CARD_STATUS } = require('../utils/cardStatus');
const { DEFAULT_CARD_TYPE } = require('../utils/cardType');

const cardSchema = new mongoose.Schema({
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    // Issue key, unique across all cards
    productId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    // Who works on the card; null in the backlog. Cards created before assignees existed read as the author
    assignee: { type: String, default: null },
    submittedAt: { type: Date, default: Date.now },
    // Key of a board column (models/Column.js, shared by all users) or "backlog";
    // checked against the columns in cardController
    status: { type: String, default: DEFAULT_CARD_STATUS },
    // Key of an issue type (models/IssueType.js, shared by all users), checked in cardController;
    // cards created before types existed read as "task"
    type: { type: String, default: DEFAULT_CARD_TYPE }
});

module.exports = mongoose.model('Card', cardSchema);