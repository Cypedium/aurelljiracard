const { generateAccessToken } = require("../utils/jwt");

exports.USER_ID = "64b000000000000000000001";

exports.authHeader = (username = "alice", id = exports.USER_ID, role) =>
  `Bearer ${generateAccessToken({ _id: id, username, role })}`;

// Mimics a Mongoose query: awaitable directly or via .lean()/.sort()
exports.query = (result) => {
  const q = {
    lean: jest.fn().mockResolvedValue(result),
    sort: jest.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return q;
};
