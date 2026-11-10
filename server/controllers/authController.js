// server/controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { isNonEmptyString } = require("../utils/validate");
const {
  USERNAME_MAX_LENGTH,
  USERNAME_MESSAGE,
  USERNAME_TAKEN_MESSAGE,
  RUDE_USERNAME_MESSAGE,
  isRudeUsername,
  usernameIgnoreCase,
} = require("../utils/username");
const {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_REPEAT_MESSAGE,
  isRepetitivePassword,
} = require("../utils/password");

const INVALID_REFRESH_MESSAGE = "Invalid refresh token";
const DUPLICATE_KEY = 11000;

// Saves the new refresh token (its jti), so it can be traded in once
const issueTokens = async (user, familyId) => {
  const tokenId = crypto.randomUUID();
  const refreshToken = generateRefreshToken(user, tokenId);
  const { exp } = jwt.decode(refreshToken);
  await RefreshToken.create({ _id: tokenId, familyId, userId: user._id, expiresAt: new Date(exp * 1000) });
  return { accessToken: generateAccessToken(user), refreshToken };
};

// Refresh tokens issued before single-use tokens have no jti. Their id is a hash of the token,
// so each is accepted once and then starts a family. Remove 7 days after the deploy: every such
// token has expired by then
const legacyTokenId = async (refreshToken, decoded) => {
  const tokenId = crypto.createHash("sha256").update(refreshToken).digest("hex");
  try {
    await RefreshToken.updateOne(
      { _id: tokenId },
      { $setOnInsert: { familyId: crypto.randomUUID(), userId: decoded.id, expiresAt: new Date(decoded.exp * 1000) } },
      { upsert: true }
    );
  } catch (err) {
    // Another request inserted it at the same moment; the row exists either way
    if (err.code !== DUPLICATE_KEY) throw err;
  }
  return tokenId;
};

// Presence for the admin user list; a failed write must not stop login or refresh
const markActive = async (id) => {
  try {
    await User.updateOne({ _id: id }, { $set: { lastActiveAt: new Date() } });
  } catch (err) {
    console.error("Mark active error:", err.message);
  }
};

const PICTURE_MAX_LENGTH = 1.5 * 1024 * 1024; // base64 data URL, ~1 MB image
const PICTURE_URL_PATTERN = /^(data:image\/[a-z+.-]+;base64,|https?:\/\/)/i;

// ---------------- REGISTER ----------------
exports.register = async (req, res) => {
  const { username, password, pictureUrl } = req.body;

  if (!isNonEmptyString(username, USERNAME_MAX_LENGTH)) {
    return res.status(400).json({ message: USERNAME_MESSAGE });
  }
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return res.status(400).json({ message: PASSWORD_LENGTH_MESSAGE });
  }
  // After the type/length checks, in the same order as server-java
  if (isRudeUsername(username)) {
    return res.status(400).json({ message: RUDE_USERNAME_MESSAGE });
  }
  if (isRepetitivePassword(password)) {
    return res.status(400).json({ message: PASSWORD_REPEAT_MESSAGE });
  }
  if (pictureUrl && (typeof pictureUrl !== "string" || pictureUrl.length > PICTURE_MAX_LENGTH || !PICTURE_URL_PATTERN.test(pictureUrl))) {
    return res.status(400).json({ message: "Invalid profile picture." });
  }

  try {
    // "mike" is taken if "Mike" exists
    const existing = await User.findOne({ username: usernameIgnoreCase(username) });
    if (existing) {
      return res.status(409).json({ message: USERNAME_TAKEN_MESSAGE });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, passwordHash, pictureUrl: pictureUrl || undefined });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Error creating user." });
  }
};

// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    // Exact name first; otherwise any casing ("mike" logs in as "Mike")
    const user =
      (await User.findOne({ username })) ?? (await User.findOne({ username: usernameIgnoreCase(username) }));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    await markActive(user._id);

    // Frontend stores tokens in sessionStorage → return them in the body. Every login starts a new token family
    res.json(await issueTokens(user, crypto.randomUUID()));
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Error logging in." });
  }
};

// ---------------- LOGOUT ----------------
// Revokes every refresh token issued to the user by bumping tokenVersion.
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (typeof refreshToken === "string") {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await User.updateOne({ _id: decoded.id }, { $inc: { tokenVersion: 1 }, $set: { loggedOutAt: new Date() } });
    } catch {
      // Invalid or expired token: nothing to revoke
    }
  }

  res.status(200).json({ message: "Logged out successfully." });
};

// ---------------- REFRESH TOKEN ----------------
// Each refresh token works once: one that comes back after being used was copied (a duplicated
// tab, or stolen), so that whole login (its family) is revoked. Other logins keep working.
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (typeof refreshToken !== "string") {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user || (user.tokenVersion ?? 0) !== (decoded.tokenVersion ?? 0)) {
      return res.status(403).json({ message: INVALID_REFRESH_MESSAGE });
    }

    const tokenId = decoded.jti ?? (await legacyTokenId(refreshToken, decoded));
    // Atomic: of two requests with the same token, only one finds it unused
    const current = await RefreshToken.findOneAndUpdate(
      { _id: tokenId, userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } }
    );
    if (!current) {
      const reused = await RefreshToken.findOne({ _id: tokenId, userId: user._id });
      if (reused) {
        await RefreshToken.deleteMany({ familyId: reused.familyId });
      }
      return res.status(403).json({ message: INVALID_REFRESH_MESSAGE });
    }
    await markActive(user._id);

    return res.json(await issueTokens(user, current.familyId));
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(500).json({ message: "Error refreshing token." });
  }
};
