// server/utils/password.js
// Rules for new passwords; must match frontend/app/utils/register.ts and server-java AuthService.
// Login does not check them, so older passwords keep working
exports.PASSWORD_MIN_LENGTH = 8;
exports.PASSWORD_MAX_LENGTH = 72; // bcrypt ignores bytes beyond 72
exports.PASSWORD_LENGTH_MESSAGE = `Password must be ${exports.PASSWORD_MIN_LENGTH}-${exports.PASSWORD_MAX_LENGTH} characters.`;
exports.PASSWORD_REPEAT_MESSAGE = "Password must not repeat characters (e.g. aaa or 1212).";
const MIN_DISTINCT_CHARACTERS = 4;

// "aaa" anywhere, or too few different characters ("12121212", "abababab")
exports.isRepetitivePassword = (password) =>
  /(.)\1\1/su.test(password) || new Set(password).size < MIN_DISTINCT_CHARACTERS;
