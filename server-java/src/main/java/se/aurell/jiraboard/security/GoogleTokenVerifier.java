package se.aurell.jiraboard.security;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import se.aurell.jiraboard.config.GoogleProperties;
import se.aurell.jiraboard.exception.ApiException;

/**
 * Checks a Google ID token (the "credential" from Google's sign-in button): RS256 signature
 * against Google's published keys, issuer, audience = our client id, expiry, and a verified email.
 */
@Component
public class GoogleTokenVerifier {

    static final String JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
    static final List<String> ISSUERS = List.of("accounts.google.com", "https://accounts.google.com");

    static final String INVALID_MESSAGE = "Invalid Google credential.";
    static final String NOT_CONFIGURED_MESSAGE = "Google sign-in is not configured.";

    private final JwtDecoder decoder;

    @Autowired
    public GoogleTokenVerifier(GoogleProperties properties) {
        this(properties.clientId(), StringUtils.hasText(properties.clientId())
                // Google's keys are fetched on first use and cached
                ? NimbusJwtDecoder.withJwkSetUri(JWK_SET_URI).jwsAlgorithm(SignatureAlgorithm.RS256).build()
                : null);
    }

    /** decoder null = not configured. Tests pass a decoder for their own key. */
    GoogleTokenVerifier(String clientId, NimbusJwtDecoder decoder) {
        if (decoder != null) {
            decoder.setJwtValidator(validator(clientId));
        }
        this.decoder = decoder;
    }

    /**
     * @throws ApiException 401 if the token is not a valid Google ID token for this app,
     *         503 if GOOGLE_CLIENT_ID is not set
     */
    public GoogleIdentity verify(String credential) {
        if (decoder == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, NOT_CONFIGURED_MESSAGE);
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(credential);
        } catch (JwtException e) {
            throw ApiException.unauthorized(INVALID_MESSAGE);
        }
        return new GoogleIdentity(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("picture"));
    }

    private static OAuth2TokenValidator<Jwt> validator(String clientId) {
        OAuth2TokenValidator<Jwt> googleClaims = jwt -> {
            boolean valid = ISSUERS.contains(jwt.getClaimAsString("iss"))
                    && jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                    && StringUtils.hasText(jwt.getSubject())
                    && StringUtils.hasText(jwt.getClaimAsString("email"))
                    // A boolean in current tokens; very old ones used the string "true"
                    && "true".equals(String.valueOf(jwt.getClaims().get("email_verified")));
            return valid
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", INVALID_MESSAGE, null));
        };
        // Default: exp/nbf with 60 s clock skew
        return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), googleClaims);
    }

    /** pictureUrl may be null. */
    public record GoogleIdentity(String subject, String email, String pictureUrl) {
    }
}
