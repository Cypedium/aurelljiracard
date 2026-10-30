const jwt = require("jsonwebtoken");
const { DEFAULT_ROLE } = require("./role");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role ?? DEFAULT_ROLE },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

// tokenVersion lets the server revoke every refresh token for a user (logout)
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion ?? 0 },
    process.env.REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_SECRET);
};
