package se.aurell.jiraboard.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Username and new-password rules shared by register and admin rename. Must match
 * server/utils/username.js, server/utils/password.js and frontend/app/utils/username.ts / register.ts.
 */
final class CredentialRules {

    static final String USERNAME_TAKEN_MESSAGE = "Username already taken.";
    static final String RUDE_USERNAME_MESSAGE = "Username contains inappropriate words.";
    static final String PASSWORD_LENGTH_MESSAGE = "Password must be 8-72 characters.";
    static final String PASSWORD_REPEAT_MESSAGE = "Password must not repeat characters (e.g. aaa or 1212).";

    // Matched as substrings, so short words that hide inside normal names (ass, dick, cock) are left out
    private static final List<String> RUDE_WORDS = List.of(
            "fuck", "shit", "bitch", "cunt", "whore", "slut", "bastard", "asshole", "nigger", "nigga",
            "faggot", "retard", "hitler", "porn", "penis", "vagina",
            "fitta", "knull", "javla", "helvete", "horunge", "kuksugare");
    private static final Pattern COMBINING_MARKS = Pattern.compile("[\\u0300-\\u036f]");
    private static final Pattern NON_LETTERS = Pattern.compile("[^a-z]");
    private static final Pattern THREE_IN_A_ROW = Pattern.compile("(.)\\1\\1", Pattern.DOTALL);
    private static final int MIN_DISTINCT_CHARACTERS = 4;

    private CredentialRules() {
    }

    /** "F_u.c-k", "Jävla", "sh1t" count as "fuck", "javla", "shit". */
    static boolean isRudeUsername(String username) {
        String plain = COMBINING_MARKS.matcher(Normalizer.normalize(username, Normalizer.Form.NFD)).replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replace('0', 'o').replace('1', 'i').replace('3', 'e').replace('4', 'a')
                .replace('5', 's').replace('7', 't').replace('@', 'a').replace('$', 's');
        String letters = NON_LETTERS.matcher(plain).replaceAll("");
        return RUDE_WORDS.stream().anyMatch(letters::contains);
    }

    /** "aaa" anywhere, or too few different characters ("12121212"). Login does not check this. */
    static boolean isRepetitivePassword(String password) {
        return THREE_IN_A_ROW.matcher(password).find()
                || password.codePoints().distinct().count() < MIN_DISTINCT_CHARACTERS;
    }
}
