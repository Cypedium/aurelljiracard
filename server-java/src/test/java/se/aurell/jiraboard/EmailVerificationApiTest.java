package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.security.GoogleTokenVerifier.GoogleIdentity;

class EmailVerificationApiTest extends ApiIntegrationTest {

    private static final String VERIFY_FIRST = "Please verify your email address.";
    private static final String ADD_EMAIL = "Please add your email address.";
    private static final String INVALID_LINK = "This verification link is invalid or has expired.";
    private static final String EMAIL_TAKEN = "Email already registered.";

    private ResultActions login(String usernameOrEmail) throws Exception {
        return mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(usernameOrEmail, PASSWORD)));
    }

    private ResultActions verifyEmail(String token) throws Exception {
        return mvc.perform(json(post("/auth/verify-email"), """
                {"token": "%s"}""".formatted(token)));
    }

    private ResultActions requestLink(String username, String email) throws Exception {
        String emailField = email == null ? "" : ", \"email\": \"%s\"".formatted(email);
        return mvc.perform(json(post("/auth/verification-email"), """
                {"username": "%s", "password": "%s"%s}""".formatted(username, PASSWORD, emailField)));
    }

    /** Lets the next link be sent at once (the one-minute throttle). */
    private void forgetSentLinks() {
        jdbc.update("UPDATE email_verifications SET created_at = created_at - interval '2 minutes'");
    }

    @Test
    void registrationSendsALinkAndLoginWaitsForIt() throws Exception {
        registerUnverified("alice");

        verify(emailSender).sendVerification(eq("alice@example.com"), eq("alice"), anyString(), eq(Language.EN));
        login("alice").andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(VERIFY_FIRST));

        verifyEmail(lastVerificationToken("alice@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email verified. You can log in now."));
        login("alice").andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void aLinkWorksOnce() throws Exception {
        registerUnverified("alice");
        String token = lastVerificationToken("alice@example.com");

        verifyEmail(token).andExpect(status().isOk());
        verifyEmail(token).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(INVALID_LINK));
        verifyEmail("made-up").andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(INVALID_LINK));
    }

    @Test
    void anExpiredLinkIsRefused() throws Exception {
        registerUnverified("alice");
        jdbc.update("UPDATE email_verifications SET expires_at = now() - interval '1 second'");

        verifyEmail(lastVerificationToken("alice@example.com"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(INVALID_LINK));
    }

    @Test
    void theEmailIsInTheLanguagePickedWhileRegistering() throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "email": "alice@example.com", "password": "%s", "language": "sv"}""".formatted(PASSWORD)))
                .andExpect(status().isCreated());
        verify(emailSender).sendVerification(eq("alice@example.com"), eq("alice"), anyString(), eq(Language.SV));

        mvc.perform(json(post("/auth/register"), """
                {"username": "bob", "email": "bob@example.com", "password": "%s", "language": "de"}""".formatted(PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Language must be one of: en, sv."));
    }

    @Test
    void registrationIsUndoneWhenTheEmailCantBeSent() throws Exception {
        doThrow(ApiException.serviceUnavailable("Could not send the email. Please try again later."))
                .when(emailSender).sendVerification(anyString(), anyString(), anyString(), any());

        mvc.perform(json(post("/auth/register"), """
                {"username": "alice", "email": "alice@example.com", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Could not send the email. Please try again later."));
        assertThat(userRepository.findByUsername("alice")).isEmpty();
    }

    @Test
    void aVerifiedAddressBelongsToOneAccount() throws Exception {
        register("alice");

        mvc.perform(json(post("/auth/register"), """
                {"username": "bob", "email": "ALICE@example.com", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(EMAIL_TAKEN));
    }

    @Test
    void anUnverifiedAddressCanBeOnTwoAccountsUntilOneVerifiesIt() throws Exception {
        registerUnverified("alice");
        String alicesLink = lastVerificationToken("alice@example.com");
        mvc.perform(json(post("/auth/register"), """
                {"username": "bob", "email": "alice@example.com", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isCreated());
        String bobsLink = lastVerificationToken("alice@example.com");

        verifyEmail(bobsLink).andExpect(status().isOk());
        verifyEmail(alicesLink).andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(EMAIL_TAKEN));
    }

    @Test
    void loginWorksWithTheEmailAddress() throws Exception {
        register("Mike");

        String body = login("MIKE@example.com").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(body, "$.accessToken")).isNotBlank();
        login("nobody@example.com").andExpect(status().isUnauthorized());
        // Unverified: the right password still gets the "verify first" answer
        registerUnverified("bob");
        login("bob@example.com").andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(VERIFY_FIRST));
    }

    @Test
    void anUnverifiedUserCanAskForANewLinkOrFixTheAddress() throws Exception {
        registerUnverified("alice");
        String firstLink = lastVerificationToken("alice@example.com");

        requestLink("alice", null).andExpect(status().isTooManyRequests());
        forgetSentLinks();
        requestLink("alice", "alice@work.example")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Verification email sent."));

        // The link for the old address stops working
        verifyEmail(firstLink).andExpect(status().isBadRequest());
        verifyEmail(lastVerificationToken("alice@work.example")).andExpect(status().isOk());
        login("alice@work.example").andExpect(status().isOk());
        requestLink("alice", null).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Your email is already verified."));
    }

    @Test
    void askingForALinkNeedsThePassword() throws Exception {
        registerUnverified("alice");
        forgetSentLinks();

        mvc.perform(json(post("/auth/verification-email"), """
                {"username": "alice", "password": "wrong-password"}"""))
                .andExpect(status().isUnauthorized());
        requestLink("alice", "not-an-email").andExpect(status().isBadRequest());
    }

    @Test
    void anOlderAccountWithoutEmailMustAddOne() throws Exception {
        String refreshToken = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");
        // Like an account from before V15
        jdbc.update("UPDATE users SET email = NULL, email_verified_at = NULL WHERE username = 'alice'");
        jdbc.update("DELETE FROM email_verifications");

        login("alice").andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(ADD_EMAIL));
        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(refreshToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(ADD_EMAIL));
        requestLink("alice", null).andExpect(status().isBadRequest());

        requestLink("alice", "alice@new.example").andExpect(status().isOk());
        login("alice").andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(VERIFY_FIRST));
        verifyEmail(lastVerificationToken("alice@new.example")).andExpect(status().isOk());
        login("alice").andExpect(status().isOk());
    }

    @Test
    void googleSignInDoesNotTakeOverAPasswordAccountsAddress() throws Exception {
        register("alice");
        when(googleTokenVerifier.verify("cred")).thenReturn(new GoogleIdentity("google-9", "alice@example.com"));

        mvc.perform(json(post("/auth/google"), """
                {"credential": "cred"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        "An account with this email already exists. Log in with your password and connect Google from the account menu."));
        assertThat(userRepository.findByGoogleSub("google-9")).isEmpty();
    }

    @Test
    void connectingGoogleVerifiesAnAccountWithoutAVerifiedAddress() throws Exception {
        String token = accessToken("alice");
        jdbc.update("UPDATE users SET email = NULL, email_verified_at = NULL WHERE username = 'alice'");
        when(googleTokenVerifier.verify("cred")).thenReturn(new GoogleIdentity("google-1", "alice@gmail.com"));

        mvc.perform(bearer(json(post("/user/google"), """
                {"credential": "cred"}"""), token))
                .andExpect(status().isOk());
        login("alice@gmail.com").andExpect(status().isOk());
        verify(emailSender, never()).sendVerification(eq("alice@gmail.com"), anyString(), anyString(), any());
    }
}
