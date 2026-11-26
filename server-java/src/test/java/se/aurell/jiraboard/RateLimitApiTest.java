package se.aurell.jiraboard;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.ResultActions;

/**
 * The limits switched on (a separate Spring context). The limiters keep their counts for the whole class, so
 * each test uses its own client IPs and names; register() (no IP header) may run at most 5 times in this class.
 */
@SpringBootTest(properties = {"app.rate-limit.enabled=true", "app.mail.async=false"})
class RateLimitApiTest extends ApiIntegrationTest {

    private static final String TOO_MANY = "Too many attempts. Please try again in a few minutes.";
    private static final String TOO_MANY_FAILURES = "Too many failed logins. Please try again in 15 minutes.";

    private ResultActions login(String ip, String username, String password) throws Exception {
        return mvc.perform(json(post("/auth/login").header("Fly-Client-IP", ip), """
                {"username": "%s", "password": "%s"}""".formatted(username, password)));
    }

    @Test
    void tenLoginsPerMinutePerIp() throws Exception {
        for (int i = 0; i < 10; i++) {
            login("10.0.0.1", "nobody" + i, PASSWORD).andExpect(status().isUnauthorized());
        }
        login("10.0.0.1", "nobody", PASSWORD)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", matchesPattern("[1-9]\\d*")))
                .andExpect(jsonPath("$.message").value(TOO_MANY));
        // Another client isn't affected
        login("10.0.0.2", "nobody", PASSWORD).andExpect(status().isUnauthorized());
    }

    @Test
    void fiveWrongPasswordsPauseTheAccountFromEveryIp() throws Exception {
        register("Dana");
        for (int i = 0; i < 5; i++) {
            login("10.1.0." + i, "dana", "wrong-password").andExpect(status().isUnauthorized());
        }
        // Even the right password, from a new IP: the guesses must stop
        login("10.1.0.9", "Dana", PASSWORD)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value(TOO_MANY_FAILURES));
    }

    @Test
    void aCorrectPasswordResetsTheCount() throws Exception {
        register("Erik");
        for (int i = 0; i < 4; i++) {
            login("10.2.0.1", "erik", "wrong-password").andExpect(status().isUnauthorized());
        }
        login("10.2.0.1", "erik", PASSWORD).andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            login("10.2.0.1", "erik", "wrong-password").andExpect(status().isUnauthorized());
        }
        login("10.2.0.1", "erik", PASSWORD).andExpect(status().isOk());
    }

    @Test
    void forgotPasswordAndVerificationEmailShareFiveEmailsPerIp() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(json(post("/auth/forgot-password").header("Fly-Client-IP", "10.3.0.1"), """
                    {"email": "nobody%d@example.com"}""".formatted(i))).andExpect(status().isOk());
        }
        for (int i = 0; i < 2; i++) {
            mvc.perform(json(post("/auth/verification-email").header("Fly-Client-IP", "10.3.0.1"), """
                    {"username": "nobody", "password": "x"}""")).andExpect(status().isUnauthorized());
        }
        mvc.perform(json(post("/auth/forgot-password").header("Fly-Client-IP", "10.3.0.1"), """
                {"email": "nobody@example.com"}"""))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(TOO_MANY));
    }
}
