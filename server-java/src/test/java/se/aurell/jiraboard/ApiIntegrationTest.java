package se.aurell.jiraboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import java.util.Locale;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.GoogleTokenVerifier;
import se.aurell.jiraboard.service.EmailSender;

/**
 * Full-stack API tests: real Postgres in a Testcontainer, Flyway migrations, security filter chain.
 * The Spring context (and container) is shared by every subclass; data is wiped before each test.
 */
// Tests register and log in far more often than the rate limits allow (RateLimitApiTest turns them on);
// emails are "sent" at once, so a test can read the link right after the request
@SpringBootTest(properties = {"app.rate-limit.enabled=false", "app.mail.async=false"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
abstract class ApiIntegrationTest {

    static final String PASSWORD = "secret123";
    static final String LINK_PREFIX = "http://localhost:3000/verify-email/";
    static final String RESET_LINK_PREFIX = "http://localhost:3000/reset-password/";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CardRepository cardRepository;

    @Autowired
    JdbcTemplate jdbc;

    // Declared here so every subclass shares one Spring context; GoogleTokenVerifierTest tests the real one
    @MockitoBean
    GoogleTokenVerifier googleTokenVerifier;

    // No real emails; lastVerificationToken() reads the token from the last "sent" link
    @MockitoBean
    EmailSender emailSender;

    @BeforeEach
    void stubEmailLinks() {
        when(emailSender.verificationLink(anyString())).thenAnswer(call -> LINK_PREFIX + call.getArgument(0));
        when(emailSender.passwordResetLink(anyString())).thenAnswer(call -> RESET_LINK_PREFIX + call.getArgument(0));
    }

    @BeforeEach
    void cleanDatabase() {
        cardRepository.deleteAll();
        // Boards, their members, lists and issue types go with their owner (ON DELETE CASCADE, V11)
        userRepository.deleteAll();
        // Every feature on and read-only mode off (V12 seeds them so)
        jdbc.update("UPDATE feature_switches SET disabled = false, updated_at = NULL, updated_by = NULL");
    }

    /** The user's own board (GET /board lists it first). */
    String boardId(String token) throws Exception {
        return JsonPath.read(mvc.perform(bearer(get("/board"), token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$[0]._id");
    }

    /** The owner creates an invite link and the other user joins with it; returns the owner's board id. */
    String joinBoard(String ownerToken, String memberToken) throws Exception {
        String board = boardId(ownerToken);
        String token = JsonPath.read(mvc.perform(bearer(post("/board/" + board + "/invite"), ownerToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.token");
        mvc.perform(bearer(post("/invite/" + token), memberToken)).andExpect(status().isOk());
        return board;
    }

    /** "/board/{board}" + rest, e.g. on(board, "/card"). */
    static String on(String board, String rest) {
        return "/board/" + board + rest;
    }

    /** Registers a user, makes them admin (set directly in the database, like in production) and returns their access token. */
    String adminAccessToken(String username) throws Exception {
        register(username);
        jdbc.update("UPDATE users SET role = 'admin' WHERE username = ?", username);
        return JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(username, PASSWORD)))
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    /** Registers the user with a verified email (<username>@example.com), so they can log in. */
    void register(String username) throws Exception {
        registerUnverified(username);
        jdbc.update("UPDATE users SET email_verified_at = now() WHERE username = ?", username);
    }

    /** Registers the user; login is refused until the emailed link is opened. */
    void registerUnverified(String username) throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "%s", "email": "%s", "password": "%s"}""".formatted(username, emailOf(username), PASSWORD)))
                .andExpect(status().isCreated());
    }

    static String emailOf(String username) {
        return username.toLowerCase(Locale.ROOT) + "@example.com";
    }

    /** The token in the last verification link sent to the address. */
    String lastVerificationToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailSender, atLeastOnce()).sendVerification(eq(email), anyString(), link.capture(), any());
        return link.getValue().substring(LINK_PREFIX.length());
    }

    /** The token in the last password reset link sent to the address. */
    String lastResetToken(String email) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailSender, atLeastOnce()).sendPasswordReset(eq(email), anyString(), link.capture(), any());
        return link.getValue().substring(RESET_LINK_PREFIX.length());
    }

    /** Registers the user and returns the login response body ({ accessToken, refreshToken }). */
    String registerAndLogin(String username) throws Exception {
        register(username);
        return mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(username, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    String accessToken(String username) throws Exception {
        return JsonPath.read(registerAndLogin(username), "$.accessToken");
    }

    static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }
}
