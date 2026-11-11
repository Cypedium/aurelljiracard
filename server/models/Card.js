const mongoose = require('mongoose');
const { DEFAULT_CARD_STATUS } = require('../utils/cardStatus');
const { DEFAULT_CARD_TYPE } = require('../utils/cardType');

const cardSchema = new mongoose.Schema({
    // The board the card is on (models/Board.js)
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    // Issue key, unique on its board (index below)
    productId: { type: String, required: true },
    username: { type: String, required: true },
    // Who works on the card; null in the backlog. Cards created before assignees existed read as the author
    assignee: { type: String, default: null },
    submittedAt: { type: Date, default: Date.now },
    // Key of a column on the card's board (models/Column.js) or "backlog";
    // checked against the columns in cardController
    status: { type: String, default: DEFAULT_CARD_STATUS },
    // Key of an issue type on the card's board (models/IssueType.js), checked in cardController;
    // cards created before types existed read as "task"
    type: { type: String, default: DEFAULT_CARD_TYPE }
});

// Issue keys are unique per board; GET /board/:id/card lists newest first
cardSchema.index({ boardId: 1, productId: 1 }, { unique: true });
cardSchema.index({ boardId: 1, submittedAt: -1 });

module.exports = mongoose.model('Card', cardSchema);