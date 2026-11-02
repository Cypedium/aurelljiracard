// server/utils/cardStatus.js
// Board columns in order; must match DEFAULT_HEADERS keys in frontend/app/utils/boardLayout.ts
const BOARD_STATUSES = ["todo", "in-progress", "test", "done"];
// Backlog cards are not on the board and have no assignee; must match frontend/app/utils/backlog.ts
const BACKLOG_STATUS = "backlog";

exports.BOARD_STATUSES = BOARD_STATUSES;
exports.BACKLOG_STATUS = BACKLOG_STATUS;
exports.CARD_STATUSES = [...BOARD_STATUSES, BACKLOG_STATUS];
exports.DEFAULT_CARD_STATUS = "todo";
