package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class AuthApiTest extends ApiIntegrationTest {

    @Test
    void registerThenLoginReturnsBothTokens() throws Exception {
        register("alice");

        mvc.perform(json(post("/auth/login"), """
                {"username": "alice", "password": "secret123"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString());
    }

    @Test
    void registerAcceptsEmptyPictureUrlFromTheForm() throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "password": "secret123", "pictureUrl": ""}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("User registered successfully."));
    }

    @Test
    void registerRejectsDuplicateUsername() throws Exception {
        register("alice");

        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "password": "secret123"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken."));
    }

    @Test
    void registerValidatesFields() throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "password": "secret1"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must be 8-72 characters."));

        mvc.perform(json(post("/auth/register"), """
                {"username": "   ", "password": "secret123"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is required (max 32 characters)."));

        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "password": "secret123", "pictureUrl": "javascript:alert(1)"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid profile picture."));
    }

    @Test
    void registerTreatsOtherCasingAsTaken() throws Exception {
        register("Mike");

        mvc.perform(json(post("/auth/register"), """
                {"username": "mike", "password": "secret123"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken."));
    }

    @Test
    void registerRejectsRudeUsernamesAndRepetitivePasswords() throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "Sh1t_head", "password": "secret123"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username contains inappropriate words."));

        for (String password : new String[] {"abc11112", "12121212"}) {
            mvc.perform(json(post("/auth/register"), """
                    {"username": "alice", "password": "%s"}""".formatted(password)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Password must not repeat characters (e.g. aaa or 1212)."));
        }
    }

    @Test
    void loginIgnoresCasingAndPutsStoredNameInToken() throws Exception {
        register("Mike");

        String body = mvc.perform(json(post("/auth/login"), """
                {"username": "mike", "password": "secret123"}"""))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String payload = new String(Base64.getUrlDecoder()
                .decode(JsonPath.<String>read(body, "$.accessToken").split("\\.")[1]));
        assertThat(JsonPath.<String>read(payload, "$.username")).isEqualTo("Mike");
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        register("alice");

        mvc.perform(json(post("/auth/login"), """
                {"username": "alice", "password": "wrong-password"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials."));
    }

    @Test
    void refreshIssuesNewTokens() throws Exception {
        String refreshToken = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");

        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString());
    }

    @Test
    void refreshRejectsMissingAndInvalidTokens() throws Exception {
        mvc.perform(json(post("/auth/refresh"), "{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("No refresh token provided"));

        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "not-a-jwt"}"""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    @Test
    void refreshRejectsAccessToken() throws Exception {
        String accessToken = accessToken("alice");

        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(accessToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        String refreshToken = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");
        String body = """
                {"refreshToken": "%s"}""".formatted(refreshToken);

        mvc.perform(json(post("/auth/logout"), body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully."));

        mvc.perform(json(post("/auth/refresh"), body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    @Test
    void logoutIgnoresExpiredAccessTokenHeader() throws Exception {
        // The frontend sends its (possibly expired) access token with every call, logout included
        mvc.perform(bearer(json(post("/auth/logout"), "{}"), "expired.or.invalid"))
                .andExpect(status().isOk());
    }

    @Test
    void protectedRoutesRequireValidAccessToken() throws Exception {
        mvc.perform(get("/board"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("No token provided"));

        mvc.perform(bearer(get("/board"), "not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void refreshTokenIsNotAcceptedAsAccessToken() throws Exception {
        String refreshToken = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");

        mvc.perform(bearer(get("/board"), refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }
}
