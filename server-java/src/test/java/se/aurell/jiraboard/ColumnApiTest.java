package se.aurell.jiraboard;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

class ColumnApiTest extends ApiIntegrationTest {

    @Test
    void everyoneReadsTheDefaultLists() throws Exception {
        mvc.perform(get("/column")).andExpect(status().isUnauthorized());

        mvc.perform(bearer(get("/column"), accessToken("alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].key").value(contains("todo", "in-progress", "test", "done")))
                .andExpect(jsonPath("$[0].title").value("To Do"))
                .andExpect(jsonPath("$[0].position").value(0));
    }

    @Test
    void onlyAdminsChangeLists() throws Exception {
        String alice = accessToken("alice");

        mvc.perform(bearer(json(post("/column"), """
                {"title": "Review"}"""), alice))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Admins only."));

        mvc.perform(bearer(json(put("/column/todo"), """
                {"title": "Ready"}"""), alice))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAddsAListThatEveryoneSees() throws Exception {
        String admin = adminAccessToken("boss");

        mvc.perform(bearer(json(post("/column"), """
                {"title": " Code review ", "color": "#FDD0EC"}"""), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("code-review"))
                .andExpect(jsonPath("$.title").value("Code review"))
                .andExpect(jsonPath("$.color").value("#fdd0ec"))
                .andExpect(jsonPath("$.position").value(4));

        // Same name again gets a unique key
        mvc.perform(bearer(json(post("/column"), """
                {"title": "Test"}"""), admin))
                .andExpect(jsonPath("$.key").value("test-2"));

        mvc.perform(bearer(get("/column"), accessToken("alice")))
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[4].key").value("code-review"));
    }

    @Test
    void cardsCanMoveToAnAddedList() throws Exception {
        String admin = adminAccessToken("boss");
        mvc.perform(bearer(json(post("/column"), """
                {"title": "Review"}"""), admin))
                .andExpect(status().isCreated());

        String alice = accessToken("alice");
        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "x", "productId": "AJB-1", "status": "review"}"""), alice))
                .andExpect(status().isCreated());
        String id = JsonPath.read(mvc.perform(bearer(get("/card"), alice)).andReturn().getResponse().getContentAsString(),
                "$[0]._id");

        mvc.perform(bearer(json(patch("/card/" + id + "/status"), """
                {"status": "blocked"}"""), alice))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Status must be one of: todo, in-progress, test, done, review, backlog."));

        mvc.perform(bearer(json(patch("/card/" + id + "/status"), """
                {"status": "done"}"""), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("done"));
    }

    @Test
    void adminRenamesAndRecoloursAList() throws Exception {
        String admin = adminAccessToken("boss");

        mvc.perform(bearer(json(put("/column/todo"), """
                {"title": " Ready ", "color": "#1F845A", "key": "hijack"}"""), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("todo"))
                .andExpect(jsonPath("$.title").value("Ready"))
                .andExpect(jsonPath("$.color").value("#1f845a"));

        // color null resets the default colour
        mvc.perform(bearer(json(put("/column/todo"), """
                {"title": "Ready", "color": null}"""), admin))
                .andExpect(jsonPath("$.color").doesNotExist());

        mvc.perform(bearer(json(put("/column/nope"), """
                {"title": "Nope"}"""), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("List not found."));

        mvc.perform(bearer(json(put("/column/backlog"), """
                {"title": "Nope"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid list key."));
    }

    @Test
    void validatesTitleColorAndListCount() throws Exception {
        String admin = adminAccessToken("boss");

        for (String body : new String[] {"{}", "{\"title\": \"  \"}", "{\"title\": \"%s\"}".formatted("x".repeat(51))}) {
            mvc.perform(bearer(json(post("/column"), body), admin))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("List name is required (max 50 characters)."));
        }
        mvc.perform(bearer(json(post("/column"), """
                {"title": "Review", "color": "red"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("List color must be a hex color like #eed7fc."));

        for (int i = 4; i < 12; i++) {
            mvc.perform(bearer(json(post("/column"), """
                    {"title": "List %d"}""".formatted(i)), admin))
                    .andExpect(status().isCreated());
        }
        mvc.perform(bearer(json(post("/column"), """
                {"title": "One more"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The board can have at most 12 lists."));
    }
}
