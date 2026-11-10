package se.aurell.jiraboard.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;
import se.aurell.jiraboard.config.JwtProperties;
import se.aurell.jiraboard.entity.User;

/**
 * Issues HS256 tokens with the same payloads as server/utils/jwt.js:
 * access { id, username, role } and refresh { id, tokenVersion }.
 */
@Service
public class JwtService {

    static final String CLAIM_ID = "id";
    static final String CLAIM_USERNAME = "username";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_TOKEN_VERSION = "tokenVersion";

    private static final JwsHeader HEADER = JwsHeader.with(MacAlgorithm.HS256).build();

    private final JwtProperties properties;
    private final JwtEncoder accessEncoder;
    private final JwtEncoder refreshEncoder;
    private final JwtDecoder refreshDecoder;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.accessEncoder = encoder(properties.accessSecret());
        this.refreshEncoder = encoder(properties.refreshSecret());
        this.refreshDecoder = decoder(properties.refreshSecret());
    }

    /** HS256 decoder for the given secret; used for access tokens by the Bearer token filter. */
    public static JwtDecoder decoder(String secret) {
        return NimbusJwtDecoder.withSecretKey(hmacKey(secret)).macAlgorithm(MacAlgorithm.HS256).build();
    }

    public String issueAccessToken(User user) {
        JwtClaimsSet claims = baseClaims(properties.accessTtl().toSeconds())
                .claim(CLAIM_ID, user.getId().toString())
                .claim(CLAIM_USERNAME, user.getUsername())
                .claim(CLAIM_ROLE, user.getRole().getValue())
                .build();
        return accessEncoder.encode(JwtEncoderParameters.from(HEADER, claims)).getTokenValue();
    }

    /**
     * tokenVersion lets the server revoke every refresh token for a user (logout); the jti
     * (tokenId) is the row in refresh_tokens that makes the token single-use.
     */
    public IssuedRefreshToken issueRefreshToken(User user, UUID tokenId) {
        JwtClaimsSet claims = baseClaims(properties.refreshTtl().toSeconds())
                .id(tokenId.toString())
                .claim(CLAIM_ID, user.getId().toString())
                .claim(CLAIM_TOKEN_VERSION, user.getTokenVersion())
                .build();
        String value = refreshEncoder.encode(JwtEncoderParameters.from(HEADER, claims)).getTokenValue();
        return new IssuedRefreshToken(value, claims.getExpiresAt());
    }

    /** @throws JwtException if the token is invalid, expired or not a refresh token */
    public RefreshClaims decodeRefreshToken(String token) {
        Jwt jwt = refreshDecoder.decode(token);
        Object version = jwt.getClaim(CLAIM_TOKEN_VERSION);
        String id = jwt.getClaimAsString(CLAIM_ID);
        if (!(version instanceof Number number) || id == null) {
            throw new JwtException("Not a refresh token");
        }
        try {
            // Tokens issued before V9 have no jti
            UUID tokenId = jwt.getId() == null ? null : UUID.fromString(jwt.getId());
            return new RefreshClaims(UUID.fromString(id), number.intValue(), tokenId, jwt.getExpiresAt());
        } catch (IllegalArgumentException e) {
            throw new JwtException("Invalid user or token id");
        }
    }

    public record IssuedRefreshToken(String value, Instant expiresAt) {
    }

    /** tokenId is null for tokens issued before single-use refresh tokens. */
    public record RefreshClaims(UUID userId, int tokenVersion, UUID tokenId, Instant expiresAt) {
    }

    private static JwtClaimsSet.Builder baseClaims(long ttlSeconds) {
        // JWTs store whole seconds; keeps IssuedRefreshToken.expiresAt equal to the token's exp
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        return JwtClaimsSet.builder().issuedAt(now).expiresAt(now.plusSeconds(ttlSeconds));
    }

    private static JwtEncoder encoder(String secret) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(hmacKey(secret)));
    }

    private static SecretKey hmacKey(String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
}
