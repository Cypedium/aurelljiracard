package se.aurell.jiraboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.repository.UserRepository;

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

    @BeforeEach
    void cleanDatabase() {
        cardRepository.deleteAll();
        userRepository.deleteAll();
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
