package se.aurell.jiraboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
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

/**
 * Full-stack API tests: real Postgres in a Testcontainer, Flyway migrations, security filter chain.
 * The Spring context (and container) is shared by every subclass; data is wiped before each test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("dev")
abstract class ApiIntegrationTest {

    static final String PASSWORD = "secret123";

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

    @BeforeEach
    void cleanDatabase() {
        cardRepository.deleteAll();
        // Boards, their members, lists and issue types go with their owner (ON DELETE CASCADE, V11)
        userRepository.deleteAll();
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

    void register(String username) throws Exception {
        mvc.perform(json(post("/auth/register"), """
                {"username": "%s", "password": "%s"}""".formatted(username, PASSWORD)))
                .andExpect(status().isCreated());
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
