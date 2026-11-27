package se.aurell.jiraboard.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Random tokens for emailed and shared links (invite, email verification, password reset). The token goes in
 * the link; only its SHA-256 is stored, so a database leak doesn't leak working links.
 */
public final class SecureTokens {

    /** 32 random bytes: 43 URL-safe characters. */
    static final int TOKEN_BYTES = 32;

    private static final SecureRandom RANDOM = new SecureRandom();

    private SecureTokens() {
    }

    /** A new random token, URL-safe Base64 without padding. */
    public static String generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** The token's SHA-256 as lowercase hex (64 characters): what the database stores and looks up. */
    public static String sha256Hex(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            // Every JVM must have SHA-256
            throw new IllegalStateException(e);
        }
    }
}
