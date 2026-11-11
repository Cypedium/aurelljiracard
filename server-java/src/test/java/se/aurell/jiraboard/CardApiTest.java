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

    /** Creates a card on the board as the given user and returns its id. */
    private String createCard(String token, String board, String body) throws Exception {
        mvc.perform(bearer(json(post(on(board, "/card")), body), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Card saved successfully!"));
        String cards = mvc.perform(bearer(get(on(board, "/card")), token)).andReturn().getResponse().getContentAsString();
        return JsonPath.read(cards, "$[0]._id");
    }

    @Test
    void createUsesTokenUsernameAndDefaults() throws Exception {
        String token = accessToken("alice");
        String board = boardId(token);

        // A username in the body must be ignored
        mvc.perform(bearer(json(post(on(board, "/card")), """
                {"rating": 3, "comment": "Login button broken", "productId": "AJB-1", "username": "mallory"}"""), token))
                .andExpect(status().isCreated());

        mvc.perform(bearer(get(on(board, "/card")), token))
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
        String board = boardId(token);
        createCard(token, board, """
                {"rating": 5, "comment": "Crash", "productId": "AJB-2", "type": "bug", "status": "in-progress"}""");

        mvc.perform(bearer(get(on(board, "/card")), token))
                .andExpect(jsonPath("$[0].type").value("bug"))
                .andExpect(jsonPath("$[0].status").value("in-progress"));
    }

    @Test
    void createValidatesFields() throws Exception {
        String token = accessToken("alice");
        String cards = on(boardId(token), "/card");

        mvc.perform(bearer(json(post(cards), """
                {"rating": 6, "comment": "x", "productId": "AJB-1"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rating must be an integer between 1 and 5."));

        mvc.perform(bearer(json(post(cards), """
                {"rating": 3, "comment": "  ", "productId": "AJB-1"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Summary is required (max 2000 characters)."));

        for (String productId : new String[] {"1MA-10", "MA-1000", "MA100", ""}) {
            mvc.perform(bearer(json(post(cards), """
                    {"rating": 3, "comment": "x", "productId": "%s"}""".formatted(productId)), token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Issue key must look like MA-100: letters, a hyphen and digits (max 6 characters)."));
        }

        mvc.perform(bearer(json(post(cards), """
                {"rating": 3, "comment": "x", "productId": "AJB-1", "type": "epic"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Type must be one of: task, bug, doc."));
    }

    @Test
    void ownerCanUpdateCard() throws Exception {
        String token = accessToken("alice");
        String board = boardId(token);
        String id = createCard(token, board, VALID_CARD);

        mvc.perform(bearer(json(put(on(board, "/card/" + id)), """
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
    void issueKeyIsUniqueOnItsBoard() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);
        String id = createCard(alice, board, VALID_CARD);

        // Also for a collaborator on the same board
        mvc.perform(bearer(json(post(on(board, "/card")), VALID_CARD), bob))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Issue key already exists."));

        // Another board may use the same key
        mvc.perform(bearer(json(post(on(boardId(bob), "/card")), VALID_CARD), bob))
                .andExpect(status().isCreated());

        // Keeping its own key is fine
        mvc.perform(bearer(json(put(on(board, "/card/" + id)), VALID_CARD), alice))
                .andExpect(status().isOk());

        createCard(alice, board, """
                {"rating": 2, "comment": "Other", "productId": "AJB-2"}""");
        mvc.perform(bearer(json(put(on(board, "/card/" + id)), """
                {"rating": 3, "comment": "Login button broken", "productId": "AJB-2"}"""), alice))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Issue key already exists."));
    }

    @Test
    void collaboratorsCannotUpdateOrDeleteOthersCards() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);
        String id = createCard(alice, board, VALID_CARD);

        mvc.perform(bearer(json(put(on(board, "/card/" + id)), VALID_CARD), bob))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only edit your own card."));

        mvc.perform(bearer(delete(on(board, "/card/" + id)), bob))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only delete your own card."));
    }

    @Test
    void boardAdminCanEditAndDeleteCollaboratorsCards() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);
        String id = createCard(bob, board, VALID_CARD);

        mvc.perform(bearer(json(put(on(board, "/card/" + id)), """
                {"rating": 1, "comment": "Fixed by the owner", "productId": "AJB-1"}"""), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comment").value("Fixed by the owner"))
                .andExpect(jsonPath("$.username").value("bob"));

        mvc.perform(bearer(delete(on(board, "/card/" + id)), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Card deleted successfully."));
    }

    @Test
    void nonMembersGetNotFoundEvenAsSiteAdmin() throws Exception {
        String alice = accessToken("alice");
        String board = boardId(alice);
        String id = createCard(alice, board, VALID_CARD);
        // The global admin role gives no rights on other people's boards
        String admin = adminAccessToken("boss");

        mvc.perform(bearer(get(on(board, "/card")), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Board not found."));
        mvc.perform(bearer(json(post(on(board, "/card")), VALID_CARD), admin))
                .andExpect(status().isNotFound());
        mvc.perform(bearer(json(put(on(board, "/card/" + id)), VALID_CARD), admin))
                .andExpect(status().isNotFound());
        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "done"}"""), admin))
                .andExpect(status().isNotFound());
        mvc.perform(bearer(delete(on(board, "/card/" + id)), admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void aCardIsOnlyFoundOnItsOwnBoard() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String id = createCard(alice, boardId(alice), VALID_CARD);

        // bob uses his own board's id with alice's card id
        mvc.perform(bearer(delete(on(boardId(bob), "/card/" + id)), bob))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Card not found."));
    }

    @Test
    void anyMemberCanMoveCard() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);
        String id = createCard(alice, board, VALID_CARD);

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "done"}"""), bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("done"))
                .andExpect(jsonPath("$.assignee").value("alice"));
    }

    @Test
    void backlogCardIsUnassignedUntilSomeoneTakesIt() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);
        String id = createCard(alice, board, """
                {"rating": 2, "comment": "Later", "productId": "AJB-3", "status": "backlog"}""");

        mvc.perform(bearer(get(on(board, "/card")), alice))
                .andExpect(jsonPath("$[0].status").value("backlog"))
                .andExpect(jsonPath("$[0].username").value("alice"))
                .andExpect(jsonPath("$[0].assignee").doesNotExist());

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "todo", "assignee": "mallory"}"""), bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("todo"))
                .andExpect(jsonPath("$.assignee").value("bob"));

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "backlog"}"""), bob))
                .andExpect(jsonPath("$.assignee").doesNotExist());
    }

    @Test
    void moveRejectsUnknownStatus() throws Exception {
        String token = accessToken("alice");
        String board = boardId(token);
        String id = createCard(token, board, VALID_CARD);

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "blocked"}"""), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Status must be one of: todo, in-progress, test, done, backlog."));
    }

    @Test
    void ownerCanDeleteCard() throws Exception {
        String token = accessToken("alice");
        String board = boardId(token);
        String id = createCard(token, board, VALID_CARD);

        mvc.perform(bearer(delete(on(board, "/card/" + id)), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Card deleted successfully."));

        mvc.perform(bearer(get(on(board, "/card")), token)).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void unknownAndMalformedIds() throws Exception {
        String token = accessToken("alice");
        String board = boardId(token);

        mvc.perform(bearer(delete(on(board, "/card/" + UUID.randomUUID())), token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Card not found."));

        mvc.perform(bearer(delete(on(board, "/card/not-a-uuid")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid card id."));

        mvc.perform(bearer(get(on("not-a-uuid", "/card")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid board id."));

        mvc.perform(bearer(get(on(UUID.randomUUID().toString(), "/card")), token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Board not found."));
    }
}
