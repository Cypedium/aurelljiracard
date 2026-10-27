package se.aurell.jiraboard.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.test.util.ReflectionTestUtils;
import se.aurell.jiraboard.config.JwtProperties;
import se.aurell.jiraboard.entity.User;

class JwtServiceTest {

    private static final String ACCESS_SECRET = "test-access-secret-0123456789abcdefgh";
    private static final String REFRESH_SECRET = "test-refresh-secret-0123456789abcdefg";

    private final JwtService jwtService = new JwtService(
            new JwtProperties(ACCESS_SECRET, REFRESH_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));

    private final UUID userId = UUID.randomUUID();

    private User user() {
        User user = new User("alice", "hash", null);
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "tokenVersion", 3);
        return user;
    }

    @Test
    void accessTokenCarriesIdAndUsernameAndExpiresIn15Minutes() {
        Jwt jwt = JwtService.decoder(ACCESS_SECRET).decode(jwtService.issueAccessToken(user()));

        assertThat(jwt.getClaimAsString("id")).isEqualTo(userId.toString());
        assertThat(jwt.getClaimAsString("username")).isEqualTo("alice");
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void accessTokenConvertsToAuthUser() {
        Jwt jwt = JwtService.decoder(ACCESS_SECRET).decode(jwtService.issueAccessToken(user()));

        assertThat(new AccessTokenConverter().convert(jwt).getPrincipal())
                .isEqualTo(new AuthUser(userId, "alice"));
    }

    @Test
    void refreshTokenRoundTrip() {
        JwtService.RefreshClaims claims = jwtService.decodeRefreshToken(jwtService.issueRefreshToken(user()));

        assertThat(claims).isEqualTo(new JwtService.RefreshClaims(userId, 3));
    }

    @Test
    void tokensAreSignedWithSeparateSecrets() {
        String accessToken = jwtService.issueAccessToken(user());
        String refreshToken = jwtService.issueRefreshToken(user());

        assertThatThrownBy(() -> jwtService.decodeRefreshToken(accessToken)).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> JwtService.decoder(ACCESS_SECRET).decode(refreshToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void refreshTokenWithoutUsernameIsNotAnAccessToken() {
        // Even if both secrets were the same, a refresh token must not authenticate API calls
        JwtService sameSecrets = new JwtService(
                new JwtProperties(ACCESS_SECRET, ACCESS_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));
        Jwt jwt = JwtService.decoder(ACCESS_SECRET).decode(sameSecrets.issueRefreshToken(user()));

        assertThatThrownBy(() -> new AccessTokenConverter().convert(jwt))
                .isInstanceOf(InvalidBearerTokenException.class);
    }

    @Test
    void shortSecretsAreRejectedAtStartup() {
        assertThatThrownBy(() -> new JwtProperties("short", REFRESH_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }
}
