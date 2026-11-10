package se.aurell.jiraboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Every @AdminOnly endpoint: 403 "Admins only." for a normal user, with a body that would otherwise be valid. */
class AdminOnlyApiTest extends ApiIntegrationTest {

    static Stream<Arguments> adminEndpoints() {
        return Stream.of(
                endpoint("POST /column", id -> json(post("/column"), """
                        {"title": "Review"}""")),
                endpoint("PUT /column", id -> json(put("/column"), """
                        {"keys": ["todo", "in-progress", "test", "done"]}""")),
                endpoint("PUT /column/{key}", id -> json(put("/column/todo"), """
                        {"title": "Ready"}""")),
                endpoint("DELETE /column/{key}", id -> delete("/column/test")),
                endpoint("POST /issue-type", id -> json(post("/issue-type"), """
                        {"label": "Epic", "color": "#6e5dc6", "icon": "star"}""")),
                endpoint("DELETE /issue-type/{key}", id -> delete("/issue-type/bug")),
                endpoint("PATCH /user/{id}", id -> json(patch("/user/" + id), """
                        {"role": "admin"}""")),
                endpoint("DELETE /user/{id}", id -> delete("/user/" + id)),
                endpoint("POST /user/{id}/logout", id -> post("/user/" + id + "/logout")));
    }

    private static Arguments endpoint(String name, Function<String, MockHttpServletRequestBuilder> request) {
        return Arguments.of(name, request);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("adminEndpoints")
    void normalUsersGetAdminsOnly(String name, Function<String, MockHttpServletRequestBuilder> request) throws Exception {
        register("bob");
        String bobId = userRepository.findByUsername("bob").orElseThrow().getId().toString();

        mvc.perform(bearer(request.apply(bobId), accessToken("alice")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Admins only."));
    }

    @Test
    void theRoleIsReadFromTheAccessToken() throws Exception {
        String oldToken = accessToken("alice");
        jdbc.update("UPDATE users SET role = 'admin' WHERE username = 'alice'");

        // Promoted in the database, but the token still says "user"
        mvc.perform(bearer(json(post("/column"), """
                {"title": "Review"}"""), oldToken))
                .andExpect(status().isForbidden());

        String newToken = loginToken("alice");
        mvc.perform(bearer(json(post("/column"), """
                {"title": "Review"}"""), newToken))
                .andExpect(status().isCreated());
    }

    private String loginToken(String username) throws Exception {
        return JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "%s", "password": "%s"}""".formatted(username, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }
}
