package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import se.aurell.jiraboard.security.GoogleTokenVerifier.GoogleIdentity;

/** Feature switches and read-only mode (docs/feature-switches.md); which handler has which switch: FeatureCoverageTest. */
class FeatureApiTest extends ApiIntegrationTest {

    private static final String DISABLED = "This feature is temporarily disabled.";
    private static final String READ_ONLY = "Aurello is in read-only mode.";
    private static final String CARD = "/card/" + UUID.randomUUID();

    private void setSwitch(String adminToken, String key, boolean enabled) throws Exception {
        mvc.perform(bearer(json(put("/feature/" + key), """
                {"enabled": %s}""".formatted(enabled)), adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value(key))
                .andExpect(jsonPath("$.enabled").value(enabled));
    }

    /** Every enforced switch with one endpoint it blocks; the board is the caller's own. */
    static Stream<Arguments> enforced() {
        return Stream.of(
                blocked("createCard", b -> json(post(on(b, "/card")), "{}")),
                blocked("editCard", b -> json(put(on(b, CARD)), "{}")),
                blocked("editCard", b -> json(patch(on(b, CARD + "/status")), "{}")),
                blocked("deleteCard", b -> delete(on(b, CARD))),
                blocked("createColumn", b -> json(post(on(b, "/column")), "{}")),
                blocked("deleteColumn", b -> delete(on(b, "/column/test"))),
                blocked("editColumns", b -> json(put(on(b, "/column/test")), "{}")),
                blocked("editColumns", b -> json(put(on(b, "/column")), "{}")),
                blocked("manageIssueTypes", b -> json(post(on(b, "/issue-type")), "{}")),
                blocked("manageIssueTypes", b -> delete(on(b, "/issue-type/bug"))),
                blocked("shareBoard", b -> post(on(b, "/invite"))),
                blocked("shareBoard", b -> delete(on(b, "/invite"))),
                blocked("shareBoard", b -> delete(on(b, "/member/" + UUID.randomUUID()))),
                blocked("joinBoard", b -> post("/invite/some-token")),
                blocked("googleConnect", b -> json(post("/user/google"), """
                        {"credential": "cred"}""")));
    }

    private static Arguments blocked(String key, Function<String, MockHttpServletRequestBuilder> request) {
        return Arguments.of(key, request);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("enforced")
    void aSwitchedOffFeatureAnswers503ButNotForTheSiteAdmin(String key,
            Function<String, MockHttpServletRequestBuilder> request) throws Exception {
        String admin = adminAccessToken("root");
        String alice = accessToken("alice");
        setSwitch(admin, key, false);

        mvc.perform(bearer(request.apply(boardId(alice)), alice))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(DISABLED));
        // The admin reaches the controller (whatever it answers there)
        int adminStatus = mvc.perform(bearer(request.apply(boardId(admin)), admin)).andReturn().getResponse().getStatus();
        assertThat(adminStatus).isNotEqualTo(503);
    }

    @Test
    void registrationOffStopsNewUsers() throws Exception {
        setSwitch(adminAccessToken("root"), "register", false);

        mvc.perform(json(post("/auth/register"), """
                {"username": "bob", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(DISABLED));
        assertThat(userRepository.findByUsername("bob")).isEmpty();
    }

    @Test
    void registrationOffStopsAFirstGoogleSignInButNotAnExistingGoogleUser() throws Exception {
        when(googleTokenVerifier.verify("known")).thenReturn(new GoogleIdentity("google-1", "known@example.com", null));
        when(googleTokenVerifier.verify("new")).thenReturn(new GoogleIdentity("google-2", "new@example.com", null));
        mvc.perform(json(post("/auth/google"), """
                {"credential": "known"}""")).andExpect(status().isOk());
        setSwitch(adminAccessToken("root"), "register", false);
        long users = userRepository.count();

        mvc.perform(json(post("/auth/google"), """
                {"credential": "new"}"""))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(DISABLED));
        mvc.perform(json(post("/auth/google"), """
                {"credential": "known"}""")).andExpect(status().isOk());
        assertThat(userRepository.count()).isEqualTo(users);
    }

    @Test
    void theBoardRoleStillAppliesWhileTheSwitchIsOn() throws Exception {
        String owner = accessToken("alice");
        String member = accessToken("bob");
        String board = joinBoard(owner, member);

        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), member))
                .andExpect(status().isForbidden());
    }

    @Test
    void readOnlyModeBlocksEveryWriteButKeepsUsersLoggedIn() throws Exception {
        String admin = adminAccessToken("root");
        String login = registerAndLogin("alice");
        String alice = JsonPath.read(login, "$.accessToken");
        String refreshToken = JsonPath.read(login, "$.refreshToken");
        String board = boardId(alice);
        setSwitch(admin, "readOnly", true);

        mvc.perform(bearer(json(post(on(board, "/card")), "{}"), alice))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(READ_ONLY));
        mvc.perform(bearer(json(put("/user/layout"), "{}"), alice))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(READ_ONLY));
        mvc.perform(json(post("/auth/register"), """
                {"username": "bob", "password": "%s"}""".formatted(PASSWORD)))
                .andExpect(status().isServiceUnavailable());

        // Reads, login, refresh and logout keep working
        mvc.perform(bearer(get(on(board, "/card")), alice)).andExpect(status().isOk());
        mvc.perform(json(post("/auth/login"), """
                {"username": "alice", "password": "%s"}""".formatted(PASSWORD))).andExpect(status().isOk());
        String next = JsonPath.read(mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(refreshToken)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.refreshToken");
        mvc.perform(json(post("/auth/logout"), """
                {"refreshToken": "%s"}""".formatted(next))).andExpect(status().isOk());

        // Site admins are exempt; turning it off restores writes
        mvc.perform(bearer(json(put("/user/layout"), "{}"), admin)).andExpect(status().is(not(503)));
        setSwitch(admin, "readOnly", false);
        String alice2 = JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "alice", "password": "%s"}""".formatted(PASSWORD)))
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), alice2)).andExpect(status().isCreated());
    }

    @Test
    void getFeatureIsPublicAndOnlyAdminsSeeTheSwitches() throws Exception {
        String admin = adminAccessToken("root");
        String alice = accessToken("alice");
        setSwitch(admin, "createCard", false);
        setSwitch(admin, "backlogPage", false);
        setSwitch(admin, "readOnly", true);

        mvc.perform(get("/feature"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readOnly").value(true))
                .andExpect(jsonPath("$.disabled", hasSize(2)))
                .andExpect(jsonPath("$.disabled[0]").value("createCard"))
                .andExpect(jsonPath("$.disabled[1]").value("backlogPage"))
                .andExpect(jsonPath("$.switches").doesNotExist());
        mvc.perform(bearer(get("/feature"), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.switches").doesNotExist());

        mvc.perform(bearer(get("/feature"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.switches", hasSize(17)))
                .andExpect(jsonPath("$.switches[?(@.key == 'createCard')].enabled").value(false))
                .andExpect(jsonPath("$.switches[?(@.key == 'createCard')].updatedBy").value("root"))
                .andExpect(jsonPath("$.switches[?(@.key == 'readOnly')].enabled").value(true))
                .andExpect(jsonPath("$.switches[?(@.key == 'backlogPage')].uiOnly").value(true))
                .andExpect(jsonPath("$.switches[?(@.key == 'register')].updatedBy", contains(nullValue())));
    }

    @Test
    void uiOnlySwitchesNeverBlockReads() throws Exception {
        String admin = adminAccessToken("root");
        String alice = accessToken("alice");
        for (String key : new String[] {"backlogPage", "boardSwitcher", "issueTypesPage", "boardBackground", "navbarColour"}) {
            setSwitch(admin, key, false);
        }

        String board = boardId(alice);
        mvc.perform(bearer(get(on(board, "/card")), alice)).andExpect(status().isOk());
        mvc.perform(bearer(get(on(board, "/issue-type")), alice)).andExpect(status().isOk());
        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), alice)).andExpect(status().isCreated());
    }

    @Test
    void putFeatureValidatesTheKeyAndBody() throws Exception {
        String admin = adminAccessToken("root");

        mvc.perform(bearer(json(put("/feature/theme"), """
                {"enabled": false}"""), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Unknown feature."));
        // The database key of read-only mode is not an API key
        mvc.perform(bearer(json(put("/feature/writes"), """
                {"enabled": false}"""), admin))
                .andExpect(status().isNotFound());
        mvc.perform(bearer(json(put("/feature/createCard"), "{}"), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("enabled must be true or false."));
    }

    @Test
    void aDeletedAdminLeavesTheSwitchWithoutUpdatedBy() throws Exception {
        String admin = adminAccessToken("root");
        setSwitch(admin, "createCard", false);
        jdbc.update("DELETE FROM users WHERE username = 'root'");

        assertThat(jdbc.queryForObject(
                "SELECT updated_by FROM feature_switches WHERE feature_key = 'createCard'", UUID.class)).isNull();
        assertThat(jdbc.queryForObject(
                "SELECT disabled FROM feature_switches WHERE feature_key = 'createCard'", Boolean.class)).isTrue();
    }
}
