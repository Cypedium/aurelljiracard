package se.aurell.jiraboard;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class UserApiTest extends ApiIntegrationTest {

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
                  "cards": [{"id": "c1", "x": 1, "y": 0, "w": 1, "h": 2}]
                }"""), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Layout updated successfully."));

        mvc.perform(bearer(get("/user/layout"), token))
                .andExpect(jsonPath("$.cols").value(4))
                .andExpect(jsonPath("$.headers[0].key").value("in-progress"))
                .andExpect(jsonPath("$.headers[0].title").value("Doing"))
                .andExpect(jsonPath("$.cards[0].id").value("c1"))
                .andExpect(jsonPath("$.cards[0].x").value(1))
                .andExpect(jsonPath("$.cards[0].h").value(2));
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
    }
}
