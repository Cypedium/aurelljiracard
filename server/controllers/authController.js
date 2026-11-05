// server/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
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

    // Frontend stores tokens in localStorage → return them in the body
    res.json({
      accessToken: generateAccessToken(user),
      refreshToken: generateRefreshToken(user)
    });
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
      await User.updateOne({ _id: decoded.id }, { $inc: { tokenVersion: 1 } });
    } catch {
      // Invalid or expired token: nothing to revoke
    }
  }

  res.status(200).json({ message: "Logged out successfully." });
};

// ---------------- REFRESH TOKEN ----------------
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
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    return res.json({
      accessToken: generateAccessToken(user),
      refreshToken: generateRefreshToken(user)
    });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(500).json({ message: "Error refreshing token." });
  }
};
