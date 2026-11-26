package se.aurell.jiraboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;

class PasswordResetApiTest extends ApiIntegrationTest {

    private static final String NEW_PASSWORD = "brand-new-42";
    private static final String SENT = "If an account has this email address, we have sent it a link to reset the password.";
    private static final String CHANGED = "Your password has been changed. You can log in now.";
    private static final String INVALID_LINK = "This password reset link is invalid or has expired.";

    private ResultActions forgot(String email) throws Exception {
        return mvc.perform(json(post("/auth/forgot-password"), """
                {"email": "%s"}""".formatted(email)));
    }

    private ResultActions reset(String token, String password) throws Exception {
        return mvc.perform(json(post("/auth/reset-password"), """
                {"token": "%s", "password": "%s"}""".formatted(token, password)));
    }

    private ResultActions login(String username, String password) throws Exception {
        return mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(username, password)));
    }

    /** Lets the next link be sent at once (the one-minute throttle). */
    private void forgetSentLinks() {
        jdbc.update("UPDATE password_resets SET created_at = created_at - interval '2 minutes'");
    }

    @Test
    void theLinkSetsANewPassword() throws Exception {
        register("alice");

        forgot("Alice@Example.com").andExpect(status().isOk()).andExpect(jsonPath("$.message").value(SENT));
        verify(emailSender).sendPasswordReset(eq("alice@example.com"), eq("alice"), anyString(), eq(Language.EN));

        reset(lastResetToken("alice@example.com"), NEW_PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(CHANGED));
        login("alice", PASSWORD).andExpect(status().isUnauthorized());
        login("alice", NEW_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void aResetLogsOutEveryDevice() throws Exception {
        String refreshToken = JsonPath.read(registerAndLogin("alice"), "$.refreshToken");

        forgot("alice@example.com");
        reset(lastResetToken("alice@example.com"), NEW_PASSWORD).andExpect(status().isOk());

        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(refreshToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theAnswerIsTheSameWhenNoEmailIsSent() throws Exception {
        registerUnverified("bob");
        userRepository.save(User.fromGoogle("carol", "g-carol", "carol@example.com", Instant.now()));

        // No account, an unverified address, a Google-only account
        for (String email : new String[] {"nobody@example.com", "bob@example.com", "carol@example.com"}) {
            forgot(email).andExpect(status().isOk()).andExpect(jsonPath("$.message").value(SENT));
        }
        verify(emailSender, never()).sendPasswordReset(anyString(), anyString(), anyString(), any());
    }

    @Test
    void oneEmailPerMinuteAndANewLinkReplacesTheOldOne() throws Exception {
        register("alice");
        forgot("alice@example.com");
        String first = lastResetToken("alice@example.com");

        forgot("alice@example.com").andExpect(status().isOk()).andExpect(jsonPath("$.message").value(SENT));
        verify(emailSender, times(1)).sendPasswordReset(anyString(), anyString(), anyString(), any());

        forgetSentLinks();
        forgot("alice@example.com");
        String second = lastResetToken("alice@example.com");

        reset(first, NEW_PASSWORD).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(INVALID_LINK));
        reset(second, NEW_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void aLinkWorksOnceAndExpires() throws Exception {
        register("alice");
        forgot("alice@example.com");
        String token = lastResetToken("alice@example.com");

        reset(token, NEW_PASSWORD).andExpect(status().isOk());
        reset(token, "another-pass-7").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(INVALID_LINK));
        reset("made-up", NEW_PASSWORD).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(INVALID_LINK));

        forgetSentLinks();
        forgot("alice@example.com");
        jdbc.update("UPDATE password_resets SET expires_at = now() - interval '1 second'");
        reset(lastResetToken("alice@example.com"), "another-pass-7").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(INVALID_LINK));
    }

    @Test
    void theNewPasswordFollowsTheRegisterRules() throws Exception {
        register("alice");
        forgot("alice@example.com");
        String token = lastResetToken("alice@example.com");

        reset(token, "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must be 8-72 characters."));
        reset(token, "aaab1234").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must not repeat characters (e.g. aaa or 1212)."));
        // A refused password doesn't use up the link
        reset(token, NEW_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void anInvalidAddressIsRefused() throws Exception {
        forgot("not-an-email").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter a valid email address (max 254 characters)."));
    }

    @Test
    void theEmailUsesTheAccountsLanguageElseThePages() throws Exception {
        register("alice");
        mvc.perform(json(post("/auth/forgot-password"), """
                {"email": "alice@example.com", "language": "sv"}"""));
        verify(emailSender).sendPasswordReset(anyString(), anyString(), anyString(), eq(Language.SV));
    }

    @Test
    void aFailedSendLooksTheSameAndKeepsNoLink() throws Exception {
        register("alice");
        doThrow(ApiException.serviceUnavailable("Could not send the email. Please try again later."))
                .when(emailSender).sendPasswordReset(anyString(), anyString(), anyString(), any());

        forgot("alice@example.com").andExpect(status().isOk()).andExpect(jsonPath("$.message").value(SENT));
        reset(lastResetToken("alice@example.com"), NEW_PASSWORD).andExpect(status().isBadRequest());
    }

    @Test
    void withoutMailConfigEveryAddressGets503() throws Exception {
        doThrow(ApiException.serviceUnavailable("Email is not configured.")).when(emailSender).requireConfigured();

        forgot("nobody@example.com").andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Email is not configured."));
    }
}
