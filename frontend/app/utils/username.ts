// Same word list and normalisation as the backend (server/utils/username.js, server-java CredentialRules)
export const USERNAME_TAKEN_MESSAGE = "Username already taken.";
export const RUDE_USERNAME_MESSAGE = "Username contains inappropriate words.";

// Matched as substrings, so short words that hide inside normal names (ass, dick, cock) are left out
const RUDE_WORDS = [
  "fuck", "shit", "bitch", "cunt", "whore", "slut", "bastard", "asshole", "nigger", "nigga",
  "faggot", "retard", "hitler", "porn", "penis", "vagina",
  "fitta", "knull", "javla", "helvete", "horunge", "kuksugare",
];
const LEET: Record<string, string> = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

// "F_u.c-k", "Jävla", "sh1t" → "fuck", "javla", "shit"
const normalize = (username: string) =>
  username
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-z]/g, "");

export const isRudeUsername = (username: string): boolean => {
  const plain = normalize(username);
  return RUDE_WORDS.some((word) => plain.includes(word));
};
