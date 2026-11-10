package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.web.servlet.ResultActions;
import se.aurell.jiraboard.config.JwtProperties;

/** Single-use refresh tokens: reusing one revokes that login (its token family), not the user's other logins. */
class RefreshTokenApiTest extends ApiIntegrationTest {

    @Autowired
    JwtProperties jwtProperties;

    private ResultActions refresh(String refreshToken) throws Exception {
        return mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(refreshToken)));
    }

    private String refreshOk(String refreshToken) throws Exception {
        return JsonPath.read(refresh(refreshToken).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.refreshToken");
    }

    private void expectRejected(String refreshToken) throws Exception {
        refresh(refreshToken)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    private String login(String username) throws Exception {
        return JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(username, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.refreshToken");
    }

    @Test
    void eachRefreshTokenWorksOnce() throws Exception {
        String first = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");
        String second = refreshOk(first);
        String third = refreshOk(second);

        expectRejected(first);
        // The reuse revoked the whole login, including the newest token
        expectRejected(third);
    }

    @Test
    void reuseRevokesOnlyThatLogin() throws Exception {
        String laptop = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");
        String phone = login("alice");

        refreshOk(laptop);
        expectRejected(laptop);

        refreshOk(phone);
    }

    @Test
    void logoutStillRevokesEveryLogin() throws Exception {
        String laptop = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");
        String phone = login("alice");

        mvc.perform(json(post("/auth/logout"), """
                {"refreshToken": "%s"}""".formatted(laptop)))
                .andExpect(status().isOk());

        expectRejected(phone);
    }

    @Test
    void tokenFromBeforeSingleUseTokensIsAcceptedOnce() throws Exception {
        register("alice");
        String oldToken = tokenWithoutJti(userRepository.findByUsername("alice").orElseThrow().getId().toString());

        String next = refreshOk(oldToken);
        expectRejected(oldToken);
        // The old token started a family, which the reuse revoked
        expectRejected(next);
    }

    @Test
    void deletingTheUserRemovesTheirTokens() throws Exception {
        registerAndLogin("alice");

        userRepository.deleteAll();

        assertThat(
                jdbc.queryForObject("SELECT count(*) FROM refresh_tokens", Integer.class)).isZero();
    }

    /** A refresh token as issued before V9__refresh_tokens.sql: { id, tokenVersion }, no jti. */
    private String tokenWithoutJti(String userId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuedAt(now).expiresAt(now.plus(Duration.ofDays(7)))
                .claim("id", userId).claim("tokenVersion", 0)
                .build();
        var key = new SecretKeySpec(jwtProperties.refreshSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        return new NimbusJwtEncoder(new ImmutableSecret<>(key))
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}
