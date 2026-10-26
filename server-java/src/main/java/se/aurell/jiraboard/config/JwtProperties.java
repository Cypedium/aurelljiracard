package se.aurell.jiraboard.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** JWT_SECRET / REFRESH_SECRET and token lifetimes (access 15m, refresh 7d). */
@ConfigurationProperties("app.jwt")
public record JwtProperties(String accessSecret, String refreshSecret, Duration accessTtl, Duration refreshTtl) {

    // HS256 needs a key of at least 256 bits
    private static final int MIN_SECRET_BYTES = 32;

    public JwtProperties {
        requireStrongSecret("JWT_SECRET", accessSecret);
        requireStrongSecret("REFRESH_SECRET", refreshSecret);
    }

    private static void requireStrongSecret(String name, String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(name + " must be set and at least " + MIN_SECRET_BYTES + " bytes long.");
        }
    }
}
