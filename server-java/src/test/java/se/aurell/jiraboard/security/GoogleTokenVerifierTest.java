package se.aurell.jiraboard.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.time.Instant;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import se.aurell.jiraboard.exception.ApiException;

/** Google's keys are replaced by a local RSA key; the claim checks are the real ones. */
class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "test-client.apps.googleusercontent.com";

    private static RSAKey key;
    private static NimbusJwtEncoder encoder;

    @BeforeAll
    static void createKey() throws Exception {
        key = new RSAKeyGenerator(2048).keyID("test").generate();
        encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
    }

    private static GoogleTokenVerifier verifier() throws Exception {
        return new GoogleTokenVerifier(CLIENT_ID, NimbusJwtDecoder.withPublicKey(key.toRSAPublicKey()).build());
    }

    /** A valid Google ID token, changed by the given customizer. */
    private static String token(Consumer<JwtClaimsSet.Builder> customizer) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("https://accounts.google.com")
                .audience(java.util.List.of(CLIENT_ID))
                .subject("1234567890")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .claim("email", "mikael.aurell@gmail.com")
                .claim("email_verified", true)
                .claim("picture", "https://lh3.googleusercontent.com/a/photo");
        customizer.accept(claims);
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId("test").build();
        return encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    @Test
    void acceptsValidTokenAndReturnsIdentity() throws Exception {
        GoogleTokenVerifier.GoogleIdentity identity = verifier().verify(token(c -> { }));

        assertThat(identity.subject()).isEqualTo("1234567890");
        assertThat(identity.email()).isEqualTo("mikael.aurell@gmail.com");
        assertThat(identity.pictureUrl()).isEqualTo("https://lh3.googleusercontent.com/a/photo");
    }

    @Test
    void acceptsIssuerWithoutScheme() throws Exception {
        assertThat(verifier().verify(token(c -> c.issuer("accounts.google.com"))).subject()).isEqualTo("1234567890");
    }

    @Test
    void rejectsTokensThatAreNotForThisApp() throws Exception {
        GoogleTokenVerifier verifier = verifier();
        for (String token : new String[] {
                token(c -> c.audience(java.util.List.of("other-client"))),
                token(c -> c.issuer("https://evil.example.com")),
                token(c -> c.claim("email_verified", false)),
                token(c -> c.claims(m -> m.remove("email"))),
                token(c -> c.issuedAt(Instant.now().minusSeconds(7200)).expiresAt(Instant.now().minusSeconds(3600))),
                "not-a-jwt"}) {
            assertThatThrownBy(() -> verifier.verify(token))
                    .isInstanceOfSatisfying(ApiException.class, e -> {
                        assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                        assertThat(e.getMessage()).isEqualTo("Invalid Google credential.");
                    });
        }
    }

    @Test
    void rejectsTokenSignedWithAnotherKey() throws Exception {
        RSAKey otherKey = new RSAKeyGenerator(2048).keyID("test").generate();
        String forged = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(otherKey)))
                .encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).keyId("test").build(),
                        JwtClaimsSet.builder()
                                .issuer("https://accounts.google.com")
                                .audience(java.util.List.of(CLIENT_ID))
                                .subject("1234567890")
                                .expiresAt(Instant.now().plusSeconds(3600))
                                .claim("email", "mikael.aurell@gmail.com")
                                .claim("email_verified", true)
                                .build()))
                .getTokenValue();

        assertThatThrownBy(() -> verifier().verify(forged))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void answers503WhenClientIdIsNotSet() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier(null, null);

        assertThatThrownBy(() -> verifier.verify("anything"))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(e.getMessage()).isEqualTo("Google sign-in is not configured.");
                });
    }
}
