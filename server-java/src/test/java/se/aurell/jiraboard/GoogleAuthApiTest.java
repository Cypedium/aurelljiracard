package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.security.GoogleTokenVerifier.GoogleIdentity;

/** The Google token check is mocked here (see GoogleTokenVerifierTest); these test the accounts. */
class GoogleAuthApiTest extends ApiIntegrationTest {

    private static final GoogleIdentity MIKAEL =
            new GoogleIdentity("google-1", "mikael.aurell@gmail.com", "https://lh3.googleusercontent.com/a/photo");

    private String googleLogin(String credential) throws Exception {
        return mvc.perform(json(post("/auth/google"), """
                {"credential": "%s"}""".formatted(credential)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString())
                .andReturn().getResponse().getContentAsString();
    }

    private static String usernameIn(String loginResponse) {
        String accessToken = JsonPath.read(loginResponse, "$.accessToken");
        String payload = new String(Base64.getUrlDecoder().decode(accessToken.split("\\.")[1]), StandardCharsets.UTF_8);
        return JsonPath.read(payload, "$.username");
    }

    @Test
    void firstSignInCreatesUserNamedAfterTheEmail() throws Exception {
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);

        assertThat(usernameIn(googleLogin("cred"))).isEqualTo("mikael.aurell");

        User user = userRepository.findByGoogleSub("google-1").orElseThrow();
        assertThat(user.getUsername()).isEqualTo("mikael.aurell");
        assertThat(user.getEmail()).isEqualTo("mikael.aurell@gmail.com");
        assertThat(user.getPictureUrl()).isEqualTo("https://lh3.googleusercontent.com/a/photo");
        assertThat(user.getPasswordHash()).isNull();
    }

    @Test
    void nextSignInLogsInAsTheSameUser() throws Exception {
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);

        googleLogin("cred");
        assertThat(usernameIn(googleLogin("cred"))).isEqualTo("mikael.aurell");
        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void takenNameGetsANumber() throws Exception {
        register("Mikael.Aurell");
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);

        assertThat(usernameIn(googleLogin("cred"))).isEqualTo("mikael.aurell2");
    }

    @Test
    void googleUserCannotLogInWithAPassword() throws Exception {
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);
        googleLogin("cred");

        mvc.perform(json(post("/auth/login"), """
                {"username": "mikael.aurell", "password": ""}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials."));
    }

    @Test
    void signInRejectsInvalidOrMissingCredential() throws Exception {
        when(googleTokenVerifier.verify("bad")).thenThrow(ApiException.unauthorized("Invalid Google credential."));

        mvc.perform(json(post("/auth/google"), """
                {"credential": "bad"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid Google credential."));

        mvc.perform(json(post("/auth/google"), "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Google credential is required."));
        assertThat(userRepository.count()).isZero();
    }

    @Test
    void connectedPasswordUserSignsInWithGoogle() throws Exception {
        String token = accessToken("alice");
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);

        mvc.perform(json(bearer(post("/user/google"), token), """
                {"credential": "cred"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Google account connected."));
        // Connecting again is fine
        mvc.perform(json(bearer(post("/user/google"), token), """
                {"credential": "cred"}"""))
                .andExpect(status().isOk());

        assertThat(usernameIn(googleLogin("cred"))).isEqualTo("alice");
        assertThat(userRepository.count()).isEqualTo(1);
        // The password still works
        mvc.perform(json(post("/auth/login"), """
                {"username": "alice", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void connectRejectsGoogleAccountOfAnotherUser() throws Exception {
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);
        googleLogin("cred");
        String token = accessToken("alice");

        mvc.perform(json(bearer(post("/user/google"), token), """
                {"credential": "cred"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This Google account is already connected to another user."));
    }

    @Test
    void connectRejectsASecondGoogleAccount() throws Exception {
        String token = accessToken("alice");
        when(googleTokenVerifier.verify("cred")).thenReturn(MIKAEL);
        when(googleTokenVerifier.verify("other"))
                .thenReturn(new GoogleIdentity("google-2", "other@gmail.com", null));
        mvc.perform(json(bearer(post("/user/google"), token), """
                {"credential": "cred"}"""))
                .andExpect(status().isOk());

        mvc.perform(json(bearer(post("/user/google"), token), """
                {"credential": "other"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Your account is already connected to another Google account."));
    }

    @Test
    void connectNeedsAccessToken() throws Exception {
        mvc.perform(json(post("/user/google"), """
                {"credential": "cred"}"""))
                .andExpect(status().isUnauthorized());
    }
}
