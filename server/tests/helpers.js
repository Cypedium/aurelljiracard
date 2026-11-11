const { generateAccessToken } = require("../utils/jwt");

exports.USER_ID = "64b000000000000000000001";
// The board every board-scoped test uses, and its owner (the board admin)
exports.BOARD_ID = "64d000000000000000000001";
exports.BOARD_ADMIN_ID = "64b0000000000000000000aa";

exports.authHeader = (username = "alice", id = exports.USER_ID, role) =>
  `Bearer ${generateAccessToken({ _id: id, username, role })}`;

// A token for the board's admin (its owner); the global role stays "user"
exports.boardAdminHeader = (username = "owner") => exports.authHeader(username, exports.BOARD_ADMIN_ID);

// Mimics a Mongoose query: awaitable directly or via .lean()/.sort()
exports.query = (result) => {
  const q = {
    lean: jest.fn().mockResolvedValue(result),
    sort: jest.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return q;
};

// BoardMember.findOne for middleware/boardAccess.js: the board admin is "admin", everyone else a collaborator
exports.mockMembership = (BoardMember) =>
  BoardMember.findOne.mockImplementation(({ userId }) =>
    exports.query({ role: userId === exports.BOARD_ADMIN_ID ? "admin" : "user" })
  );
