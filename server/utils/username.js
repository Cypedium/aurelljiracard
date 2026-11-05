// server/utils/username.js
// Usernames are stored as typed, but "Mike" and "mike" count as the same user.
// The word list and normalisation must match frontend/app/utils/username.ts and server-java UsernameRules
exports.USERNAME_MAX_LENGTH = 32;
exports.USERNAME_MESSAGE = `Username is required (max ${exports.USERNAME_MAX_LENGTH} characters).`;
exports.USERNAME_TAKEN_MESSAGE = "Username already taken.";
exports.RUDE_USERNAME_MESSAGE = "Username contains inappropriate words.";

// Matched as substrings, so short words that hide inside normal names (ass, dick, cock) are left out
const RUDE_WORDS = [
  "fuck", "shit", "bitch", "cunt", "whore", "slut", "bastard", "asshole", "nigger", "nigga",
  "faggot", "retard", "hitler", "porn", "penis", "vagina",
  "fitta", "knull", "javla", "helvete", "horunge", "kuksugare",
];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

// "F_u.c-k", "Jävla", "sh1t" → "fuck", "javla", "shit"
const normalize = (username) =>
  username
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-z]/g, "");

exports.isRudeUsername = (username) => {
  const plain = normalize(username);
  return RUDE_WORDS.some((word) => plain.includes(word));
};

// Exact, case-insensitive match as a query value (special characters escaped)
exports.usernameIgnoreCase = (username) =>
  new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

exports.sameUsername = (a, b) => a.toLowerCase() === b.toLowerCase();
