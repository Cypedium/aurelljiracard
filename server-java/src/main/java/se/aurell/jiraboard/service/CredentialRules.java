package se.aurell.jiraboard.service;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import se.aurell.jiraboard.exception.ApiException;

/**
 * Username and new-password rules shared by register, password reset and admin rename. Must match
 * frontend/app/utils/username.ts / register.ts.
 */
final class CredentialRules {

    static final String USERNAME_TAKEN_MESSAGE = "Username already taken.";
    static final String RUDE_USERNAME_MESSAGE = "Username contains inappropriate words.";
    static final String PASSWORD_LENGTH_MESSAGE = "Password must be 8-72 characters.";
    static final String PASSWORD_REPEAT_MESSAGE = "Password must not repeat characters (e.g. aaa or 1212).";

    // Matched as substrings, so short words that hide inside normal names (ass, dick, cock) are left out.
    // Must match shared/contract.json (SharedContractTest)
    static final List<String> RUDE_WORDS = List.of(
            "fuck", "shit", "bitch", "cunt", "whore", "slut", "bastard", "asshole", "nigger", "nigga",
            "faggot", "retard", "hitler", "porn", "penis", "vagina",
            "fitta", "knull", "javla", "helvete", "horunge", "kuksugare");
    private static final Pattern COMBINING_MARKS = Pattern.compile("[\\u0300-\\u036f]");
    private static final Pattern NON_LETTERS = Pattern.compile("[^a-z]");
    private static final Pattern THREE_IN_A_ROW = Pattern.compile("(.)\\1\\1", Pattern.DOTALL);
    private static final int MIN_DISTINCT_CHARACTERS = 4;
    // bcrypt ignores bytes beyond 72, so multi-byte passwords are checked by byte length too
    private static final int PASSWORD_MAX_BYTES = 72;

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

    /**
     * A new password (register, reset): 400 beyond 72 UTF-8 bytes, which bcrypt would ignore, or when it is
     * repetitive. The 8-72 character length is checked by the request record's annotations.
     */
    static void requireValidNewPassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > PASSWORD_MAX_BYTES) {
            throw ApiException.badRequest(PASSWORD_LENGTH_MESSAGE);
        }
        if (isRepetitivePassword(password)) {
            throw ApiException.badRequest(PASSWORD_REPEAT_MESSAGE);
        }
    }

    /** "aaa" anywhere, or too few different characters ("12121212"). Login does not check this. */
    static boolean isRepetitivePassword(String password) {
        return THREE_IN_A_ROW.matcher(password).find()
                || password.codePoints().distinct().count() < MIN_DISTINCT_CHARACTERS;
    }
}
