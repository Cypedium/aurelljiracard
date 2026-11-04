package se.aurell.jiraboard;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

class UserApiTest extends ApiIntegrationTest {

    /** Registers an admin (set directly in the database, like in production) and returns its access token. */
    private String adminToken() throws Exception {
        register("boss");
        jdbc.update("UPDATE users SET role = 'admin' WHERE username = 'boss'");
        return JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "boss", "password": "%s"}""".formatted(PASSWORD)))
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
    }

    private String idOf(String username) {
        return userRepository.findByUsername(username).orElseThrow().getId().toString();
    }

    @Test
    void onlyAdminsManageUsers() throws Exception {
        register("bob");
        String alice = accessToken("alice");

        mvc.perform(bearer(json(patch("/user/" + idOf("bob")), """
                {"role": "admin"}"""), alice))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Admins only."));
        mvc.perform(bearer(delete("/user/" + idOf("bob")), alice)).andExpect(status().isForbidden());
        mvc.perform(bearer(post("/user/" + idOf("bob") + "/logout"), alice)).andExpect(status().isForbidden());
    }

    @Test
    void adminRenamesUserAndTheirCardsFollow() throws Exception {
        String bobLogin = registerAndLogin("bob");
        String bob = JsonPath.read(bobLogin, "$.accessToken");
        String bobRefresh = JsonPath.read(bobLogin, "$.refreshToken");
        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "Mine", "productId": "AJB-1"}"""), bob))
                .andExpect(status().isCreated());
        String admin = adminToken();

        mvc.perform(bearer(json(patch("/user/" + idOf("bob")), """
                {"username": "robert", "role": "admin"}"""), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("robert"))
                .andExpect(jsonPath("$.role").value("admin"));

        mvc.perform(bearer(get("/card"), admin))
                .andExpect(jsonPath("$[0].username").value("robert"))
                .andExpect(jsonPath("$[0].assignee").value("robert"));
        // Old refresh token (old name and role) is revoked
        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(bobRefresh)))
                .andExpect(status().isForbidden());
    }

    @Test
    void renameAndRoleAreValidated() throws Exception {
        register("bob");
        register("carol");
        String admin = adminToken();

        mvc.perform(bearer(json(patch("/user/" + idOf("bob")), """
                {"username": "carol"}"""), admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken."));
        mvc.perform(bearer(json(patch("/user/" + idOf("bob")), """
                {"username": "  "}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is required (max 32 characters)."));
        mvc.perform(bearer(json(patch("/user/" + idOf("bob")), """
                {"role": "owner"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Role must be one of: user, admin."));
        mvc.perform(bearer(json(patch("/user/" + idOf("boss")), """
                {"role": "user"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot remove your own admin role."));
    }

    @Test
    void adminDeletesOnlyUsersWithoutCards() throws Exception {
        String bob = accessToken("bob");
        register("carol");
        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "Mine", "productId": "AJB-1"}"""), bob))
                .andExpect(status().isCreated());
        String admin = adminToken();

        mvc.perform(bearer(delete("/user/" + idOf("bob")), admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This user still has cards. Delete them first."));
        mvc.perform(bearer(delete("/user/" + idOf("boss")), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot delete yourself."));

        // carol is assignee of bob's card after taking it from the backlog
        String cardId = cardRepository.findAll().get(0).getId().toString();
        mvc.perform(bearer(json(patch("/card/" + cardId + "/status"), """
                {"status": "backlog"}"""), admin));
        String carolToken = JsonPath.read(mvc.perform(json(post("/auth/login"), """
                {"username": "carol", "password": "%s"}""".formatted(PASSWORD)))
                .andReturn().getResponse().getContentAsString(), "$.accessToken");
        mvc.perform(bearer(json(patch("/card/" + cardId + "/status"), """
                {"status": "todo"}"""), carolToken))
                .andExpect(jsonPath("$.assignee").value("carol"));

        mvc.perform(bearer(delete("/user/" + idOf("carol")), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User deleted successfully."));
        mvc.perform(bearer(get("/card"), admin))
                .andExpect(jsonPath("$[0].assignee").doesNotExist());
    }

    @Test
    void adminLogsUserOutEverywhere() throws Exception {
        String bobRefresh = JsonPath.read(registerAndLogin("bob"), "$.refreshToken");
        String admin = adminToken();

        mvc.perform(bearer(post("/user/" + idOf("bob") + "/logout"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User logged out from all sessions."));
        mvc.perform(json(post("/auth/refresh"), """
                {"refreshToken": "%s"}""".formatted(bobRefresh)))
                .andExpect(status().isForbidden());
        mvc.perform(bearer(post("/user/00000000-0000-0000-0000-000000000000/logout"), admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void listsPublicUserInfoOnly() throws Exception {
        register("alice");
        String token = accessToken("bob");

        mvc.perform(bearer(get("/user"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].username", containsInAnyOrder("alice", "bob")))
                .andExpect(jsonPath("$[0]._id").isString())
                .andExpect(jsonPath("$[0].pictureUrl").value("https://example.com/default-profile.png"))
                .andExpect(jsonPath("$[0].role").value("user"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());

        mvc.perform(bearer(get("/user/usernames"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", containsInAnyOrder("alice", "bob")));
    }

    @Test
    void newUserHasEmptyLayout() throws Exception {
        mvc.perform(bearer(get("/user/layout"), accessToken("alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cols").value(12))
                .andExpect(jsonPath("$.headers", hasSize(0)))
                .andExpect(jsonPath("$.cards", hasSize(0)));
    }

    @Test
    void layoutRoundTrip() throws Exception {
        String token = accessToken("alice");

        mvc.perform(bearer(json(put("/user/layout"), """
                {
                  "cols": 4,
                  "headers": [{"key": "in-progress", "title": "  Doing  "}],
                  "cards": [{"id": "c1", "x": 1, "y": 0, "w": 1, "h": 2, "status": "in-progress"}]
                }"""), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Layout updated successfully."));

        mvc.perform(bearer(get("/user/layout"), token))
                .andExpect(jsonPath("$.cols").value(4))
                .andExpect(jsonPath("$.headers[0].key").value("in-progress"))
                .andExpect(jsonPath("$.headers[0].title").value("Doing"))
                .andExpect(jsonPath("$.cards[0].id").value("c1"))
                .andExpect(jsonPath("$.cards[0].x").value(1))
                .andExpect(jsonPath("$.cards[0].h").value(2))
                .andExpect(jsonPath("$.cards[0].status").value("in-progress"));
    }

    @Test
    void partialLayoutUpdateKeepsOtherFields() throws Exception {
        String token = accessToken("alice");
        mvc.perform(bearer(json(put("/user/layout"), """
                {"cards": [{"id": "c1", "x": 0, "y": 0, "w": 1, "h": 2}]}"""), token))
                .andExpect(status().isOk());

        mvc.perform(bearer(json(put("/user/layout"), """
                {"cols": 4}"""), token))
                .andExpect(status().isOk());

        mvc.perform(bearer(get("/user/layout"), token))
                .andExpect(jsonPath("$.cols").value(4))
                .andExpect(jsonPath("$.cards[0].id").value("c1"));
    }

    @Test
    void layoutValidation() throws Exception {
        String token = accessToken("alice");

        mvc.perform(bearer(json(put("/user/layout"), """
                {"cols": 13}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("cols must be an integer between 1 and 12."));

        mvc.perform(bearer(json(put("/user/layout"), """
                {"headers": [{"key": "todo", "title": ""}]}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Each header needs a valid key and a title (max 50 characters)."));

        mvc.perform(bearer(json(put("/user/layout"), """
                {"headers": [{"key": "backlog", "title": "Backlog"}]}"""), token))
                .andExpect(status().isBadRequest());

        for (String status : new String[] {"Not a key", "backlog"}) {
            mvc.perform(bearer(json(put("/user/layout"), """
                    {"cards": [{"id": "c1", "x": 0, "y": 0, "status": "%s"}]}""".formatted(status)), token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Each saved card position needs a valid list key as status."));
        }

        for (String color : new String[] {"red", "#fff", "#eed7fc; x"}) {
            mvc.perform(bearer(json(put("/user/layout"), """
                    {"headers": [{"key": "todo", "title": "To Do", "color": "%s"}]}""".formatted(color)), token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Header color must be a hex color like #eed7fc."));
        }
    }

    @Test
    void headerColorIsOptionalAndLowercased() throws Exception {
        String token = accessToken("alice");

        mvc.perform(bearer(json(put("/user/layout"), """
                {"headers": [{"key": "todo", "title": "To Do", "color": "#FDD0EC"},
                             {"key": "done", "title": "Done"}]}"""), token))
                .andExpect(status().isOk());

        mvc.perform(bearer(get("/user/layout"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headers[0].color").value("#fdd0ec"))
                // No color: the field is left out, like in the Express API
                .andExpect(jsonPath("$.headers[1].color").doesNotExist());
    }
}
