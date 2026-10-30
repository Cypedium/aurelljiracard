package se.aurell.jiraboard;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CardApiTest extends ApiIntegrationTest {

    private static final String VALID_CARD = """
            {"rating": 3, "comment": "Login button broken", "productId": "AJB-1"}""";

    /** Creates a card as the given user and returns its id. */
    private String createCard(String token, String body) throws Exception {
        mvc.perform(bearer(json(post("/card"), body), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Card saved successfully!"));
        String cards = mvc.perform(bearer(get("/card"), token)).andReturn().getResponse().getContentAsString();
        return JsonPath.read(cards, "$[0]._id");
    }

    @Test
    void createUsesTokenUsernameAndDefaults() throws Exception {
        String token = accessToken("alice");

        // A username in the body must be ignored
        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "Login button broken", "productId": "AJB-1", "username": "mallory"}"""), token))
                .andExpect(status().isCreated());

        mvc.perform(bearer(get("/card"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0]._id").isString())
                .andExpect(jsonPath("$[0].username").value("alice"))
                .andExpect(jsonPath("$[0].rating").value(3))
                .andExpect(jsonPath("$[0].comment").value("Login button broken"))
                .andExpect(jsonPath("$[0].productId").value("AJB-1"))
                .andExpect(jsonPath("$[0].status").value("todo"))
                .andExpect(jsonPath("$[0].type").value("task"))
                // The board shows submittedAt.substring(2, 10)
                .andExpect(jsonPath("$[0].submittedAt").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*")));
    }

    @Test
    void createAcceptsTypeAndStatus() throws Exception {
        String token = accessToken("alice");
        createCard(token, """
                {"rating": 5, "comment": "Crash", "productId": "AJB-2", "type": "bug", "status": "in-progress"}""");

        mvc.perform(bearer(get("/card"), token))
                .andExpect(jsonPath("$[0].type").value("bug"))
                .andExpect(jsonPath("$[0].status").value("in-progress"));
    }

    @Test
    void createValidatesFields() throws Exception {
        String token = accessToken("alice");

        mvc.perform(bearer(json(post("/card"), """
                {"rating": 6, "comment": "x", "productId": "AJB-1"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rating must be an integer between 1 and 5."));

        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "  ", "productId": "AJB-1"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Summary is required (max 2000 characters)."));

        mvc.perform(bearer(json(post("/card"), """
                {"rating": 3, "comment": "x", "productId": "AJB-1", "type": "epic"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Type must be one of: task, bug, doc."));
    }

    @Test
    void ownerCanUpdateCard() throws Exception {
        String token = accessToken("alice");
        String id = createCard(token, VALID_CARD);

        mvc.perform(bearer(json(put("/card/" + id), """
                {"rating": 1, "comment": "Fixed summary", "productId": "AJB-9", "type": "doc"}"""), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._id").value(id))
                .andExpect(jsonPath("$.rating").value(1))
                .andExpect(jsonPath("$.comment").value("Fixed summary"))
                .andExpect(jsonPath("$.productId").value("AJB-9"))
                .andExpect(jsonPath("$.type").value("doc"))
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void issueKeyMustBeUnique() throws Exception {
        String token = accessToken("alice");
        String id = createCard(token, VALID_CARD);

        // Also across users
        mvc.perform(bearer(json(post("/card"), VALID_CARD), accessToken("bob")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Issue key already exists."));

        // Keeping its own key is fine
        mvc.perform(bearer(json(put("/card/" + id), VALID_CARD), token))
                .andExpect(status().isOk());

        createCard(token, """
                {"rating": 2, "comment": "Other", "productId": "AJB-2"}""");
        mvc.perform(bearer(json(put("/card/" + id), """
                {"rating": 3, "comment": "Login button broken", "productId": "AJB-2"}"""), token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Issue key already exists."));
    }

    @Test
    void otherUsersCannotUpdateOrDeleteCard() throws Exception {
        String id = createCard(accessToken("alice"), VALID_CARD);
        String bobToken = accessToken("bob");

        mvc.perform(bearer(json(put("/card/" + id), VALID_CARD), bobToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only edit your own card."));

        mvc.perform(bearer(delete("/card/" + id), bobToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only delete your own card."));
    }

    @Test
    void anyUserCanMoveCard() throws Exception {
        String id = createCard(accessToken("alice"), VALID_CARD);

        mvc.perform(bearer(json(patch("/card/" + id + "/status"), """
                {"status": "done"}"""), accessToken("bob")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("done"));
    }

    @Test
    void moveRejectsUnknownStatus() throws Exception {
        String token = accessToken("alice");
        String id = createCard(token, VALID_CARD);

        mvc.perform(bearer(json(patch("/card/" + id + "/status"), """
                {"status": "blocked"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Status must be one of: todo, in-progress, test, done."));
    }

    @Test
    void ownerCanDeleteCard() throws Exception {
        String token = accessToken("alice");
        String id = createCard(token, VALID_CARD);

        mvc.perform(bearer(delete("/card/" + id), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Card deleted successfully."));

        mvc.perform(bearer(get("/card"), token)).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void unknownAndMalformedIds() throws Exception {
        String token = accessToken("alice");

        mvc.perform(bearer(delete("/card/" + UUID.randomUUID()), token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Card not found."));

        mvc.perform(bearer(delete("/card/not-a-uuid"), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid card id."));
    }
}
