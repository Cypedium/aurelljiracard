package se.aurell.jiraboard;

import static org.hamcrest.Matchers.contains;
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

/** "boss" owns the board (its admin); "alice" joins it as a collaborator where needed. */
class ColumnApiTest extends ApiIntegrationTest {

    @Test
    void adminDeletesAListOnceItIsEmpty() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);
        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("review"));

        mvc.perform(bearer(delete(on(board, "/column/review")), alice))
                .andExpect(status().isForbidden());

        mvc.perform(bearer(json(post(on(board, "/card")), """
                {"rating": 3, "comment": "Check it", "productId": "AJB-1", "status": "review"}"""), admin))
                .andExpect(status().isCreated());
        mvc.perform(bearer(delete(on(board, "/column/review")), admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("The list still has cards. Move or delete them first."));

        String cards = mvc.perform(bearer(get(on(board, "/card")), admin)).andReturn().getResponse().getContentAsString();
        mvc.perform(bearer(delete(on(board, "/card/" + JsonPath.read(cards, "$[0]._id"))), admin))
                .andExpect(status().isOk());
        mvc.perform(bearer(delete(on(board, "/column/review")), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("List deleted."));
        mvc.perform(bearer(get(on(board, "/column")), admin))
                .andExpect(jsonPath("$[*].key").value(contains("todo", "in-progress", "test", "done")));
    }

    @Test
    void aListWithTheSameKeyOnAnotherBoardDoesNotBlockDelete() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String bossBoard = boardId(admin);
        String aliceBoard = boardId(alice);
        mvc.perform(bearer(json(post(on(bossBoard, "/column")), """
                {"title": "Review"}"""), admin)).andExpect(status().isCreated());
        mvc.perform(bearer(json(post(on(aliceBoard, "/column")), """
                {"title": "Review"}"""), alice)).andExpect(status().isCreated());
        mvc.perform(bearer(json(post(on(aliceBoard, "/card")), """
                {"rating": 3, "comment": "Check it", "productId": "AJB-1", "status": "review"}"""), alice))
                .andExpect(status().isCreated());

        mvc.perform(bearer(delete(on(bossBoard, "/column/review")), admin))
                .andExpect(status().isOk());
    }

    @Test
    void refusesToDeleteTheDefaultOrUnknownLists() throws Exception {
        String admin = accessToken("boss");
        String board = boardId(admin);

        mvc.perform(bearer(delete(on(board, "/column/todo")), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The default list cannot be deleted."));
        mvc.perform(bearer(delete(on(board, "/column/review")), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("List not found."));
        mvc.perform(bearer(delete(on(board, "/column/backlog")), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid list key."));
    }

    @Test
    void aNewBoardHasTheDefaultLists() throws Exception {
        String alice = accessToken("alice");
        String board = boardId(alice);
        mvc.perform(get(on(board, "/column"))).andExpect(status().isUnauthorized());

        mvc.perform(bearer(get(on(board, "/column")), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].key").value(contains("todo", "in-progress", "test", "done")))
                .andExpect(jsonPath("$[0].title").value("To Do"))
                .andExpect(jsonPath("$[0].position").value(0));
    }

    @Test
    void onlyTheBoardAdminChangesLists() throws Exception {
        String alice = accessToken("alice");
        String board = joinBoard(accessToken("boss"), alice);

        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), alice))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Board admins only."));

        mvc.perform(bearer(json(put(on(board, "/column/todo")), """
                {"title": "Ready"}"""), alice))
                .andExpect(status().isForbidden());

        mvc.perform(bearer(json(put(on(board, "/column")), """
                {"keys": ["done", "todo", "in-progress", "test"]}"""), alice))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminMovesListsForEveryoneOnTheBoard() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);
        mvc.perform(bearer(json(put(on(board, "/column")), """
                {"keys": ["done", "todo", "in-progress", "test"]}"""), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].key").value(contains("done", "todo", "in-progress", "test")))
                .andExpect(jsonPath("$[*].position").value(contains(0, 1, 2, 3)));

        mvc.perform(bearer(get(on(board, "/column")), alice))
                .andExpect(jsonPath("$[*].key").value(contains("done", "todo", "in-progress", "test")))
                .andExpect(jsonPath("$[0].title").value("Done"));
        // Other boards keep their order
        mvc.perform(bearer(get(on(boardId(alice), "/column")), alice))
                .andExpect(jsonPath("$[*].key").value(contains("todo", "in-progress", "test", "done")));
    }

    @Test
    void listOrderMustContainEveryListOnce() throws Exception {
        String admin = accessToken("boss");
        String board = boardId(admin);
        for (String body : new String[] {
                "{}",
                "{\"keys\": [\"todo\", \"in-progress\", \"test\"]}",
                "{\"keys\": [\"todo\", \"in-progress\", \"test\", \"nope\"]}",
                "{\"keys\": [\"todo\", \"todo\", \"test\", \"done\"]}",
                "{\"keys\": [null, \"in-progress\", \"test\", \"done\"]}"}) {
            mvc.perform(bearer(json(put(on(board, "/column")), body), admin))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("List order must contain every list exactly once."));
        }
        mvc.perform(bearer(get(on(board, "/column")), admin))
                .andExpect(jsonPath("$[*].key").value(contains("todo", "in-progress", "test", "done")));
    }

    @Test
    void adminAddsAListThatMembersSee() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);

        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": " Code review ", "color": "#FDD0EC"}"""), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("code-review"))
                .andExpect(jsonPath("$.title").value("Code review"))
                .andExpect(jsonPath("$.color").value("#fdd0ec"))
                .andExpect(jsonPath("$.position").value(4));

        // Same name again gets a unique key
        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Test"}"""), admin))
                .andExpect(jsonPath("$.key").value("test-2"));

        mvc.perform(bearer(get(on(board, "/column")), alice))
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[4].key").value("code-review"));
        mvc.perform(bearer(get(on(boardId(alice), "/column")), alice))
                .andExpect(jsonPath("$", hasSize(4)));
    }

    @Test
    void cardsCanMoveToAnAddedList() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);
        mvc.perform(bearer(json(post(on(board, "/column")), """
                {"title": "Review"}"""), admin))
                .andExpect(status().isCreated());

        mvc.perform(bearer(json(post(on(board, "/card")), """
                {"rating": 3, "comment": "x", "productId": "AJB-1", "status": "review"}"""), alice))
                .andExpect(status().isCreated());
        String id = JsonPath.read(mvc.perform(bearer(get(on(board, "/card")), alice))
                .andReturn().getResponse().getContentAsString(), "$[0]._id");

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "blocked"}"""), alice))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Status must be one of: todo, in-progress, test, done, review, backlog."));

        mvc.perform(bearer(json(patch(on(board, "/card/" + id + "/status")), """
                {"status": "done"}"""), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("done"));

        // The list exists only on boss's board
        mvc.perform(bearer(json(post(on(boardId(alice), "/card")), """
                {"rating": 3, "comment": "x", "productId": "AJB-1", "status": "review"}"""), alice))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminRenamesAndRecoloursAList() throws Exception {
        String admin = accessToken("boss");
        String board = boardId(admin);

        mvc.perform(bearer(json(put(on(board, "/column/todo")), """
                {"title": " Ready ", "color": "#1F845A", "key": "hijack"}"""), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("todo"))
                .andExpect(jsonPath("$.title").value("Ready"))
                .andExpect(jsonPath("$.color").value("#1f845a"));

        // color null resets the default colour
        mvc.perform(bearer(json(put(on(board, "/column/todo")), """
                {"title": "Ready", "color": null}"""), admin))
                .andExpect(jsonPath("$.color").doesNotExist());

        mvc.perform(bearer(json(put(on(board, "/column/nope")), """
                {"title": "Nope"}"""), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("List not found."));

        mvc.perform(bearer(json(put(on(board, "/column/backlog")), """
                {"title": "Nope"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid list key."));
    }

    @Test
    void validatesTitleColorAndListCount() throws Exception {
        String admin = accessToken("boss");
        String columns = on(boardId(admin), "/column");

        for (String body : new String[] {"{}", "{\"title\": \"  \"}", "{\"title\": \"%s\"}".formatted("x".repeat(51))}) {
            mvc.perform(bearer(json(post(columns), body), admin))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("List name is required (max 50 characters)."));
        }
        mvc.perform(bearer(json(post(columns), """
                {"title": "Review", "color": "red"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("List color must be a hex color like #eed7fc."));

        for (int i = 4; i < 12; i++) {
            mvc.perform(bearer(json(post(columns), """
                    {"title": "List %d"}""".formatted(i)), admin))
                    .andExpect(status().isCreated());
        }
        mvc.perform(bearer(json(post(columns), """
                {"title": "One more"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The board can have at most 12 lists."));
    }
}
