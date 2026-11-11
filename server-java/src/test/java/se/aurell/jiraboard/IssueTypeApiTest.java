package se.aurell.jiraboard;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

/** "boss" owns the board (its admin); "alice" joins it as a collaborator where needed. */
class IssueTypeApiTest extends ApiIntegrationTest {

    private static final String NEW_TYPE = """
            {"label": " User story ", "color": "#22A06B", "icon": "star"}""";

    @Test
    void aNewBoardHasTheDefaultIssueTypes() throws Exception {
        String alice = accessToken("alice");
        String board = boardId(alice);
        mvc.perform(get(on(board, "/issue-type"))).andExpect(status().isUnauthorized());

        mvc.perform(bearer(get(on(board, "/issue-type")), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].key").value(contains("task", "bug", "doc")))
                .andExpect(jsonPath("$[0].label").value("Task"))
                .andExpect(jsonPath("$[0].color").value("#4bade8"))
                .andExpect(jsonPath("$[0].icon").value("check"))
                .andExpect(jsonPath("$[0].position").value(0));
    }

    @Test
    void onlyTheBoardAdminAddsIssueTypes() throws Exception {
        String alice = accessToken("alice");
        String board = joinBoard(accessToken("boss"), alice);

        mvc.perform(bearer(json(post(on(board, "/issue-type")), NEW_TYPE), alice))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Board admins only."));
    }

    @Test
    void adminAddsAnIssueTypeThatMembersCardsCanUse() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);
        mvc.perform(bearer(json(post(on(board, "/issue-type")), NEW_TYPE), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("user-story"))
                .andExpect(jsonPath("$.label").value("User story"))
                .andExpect(jsonPath("$.color").value("#22a06b"))
                .andExpect(jsonPath("$.icon").value("star"))
                .andExpect(jsonPath("$.position").value(3));

        mvc.perform(bearer(json(post(on(board, "/card")), """
                {"rating": 3, "comment": "As a user", "productId": "AJB-1", "type": "user-story"}"""), alice))
                .andExpect(status().isCreated());
        mvc.perform(bearer(get(on(board, "/card")), alice))
                .andExpect(jsonPath("$[0].type").value("user-story"));

        // Only on boss's board
        mvc.perform(bearer(json(post(on(boardId(alice), "/card")), """
                {"rating": 3, "comment": "As a user", "productId": "AJB-1", "type": "user-story"}"""), alice))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Type must be one of: task, bug, doc."));
    }

    @Test
    void takenNameGetsAUniqueKey() throws Exception {
        String admin = accessToken("boss");
        mvc.perform(bearer(json(post(on(boardId(admin), "/issue-type")), """
                {"label": "Bug", "color": "#c9372c", "icon": "bug"}"""), admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("bug-2"));
    }

    @Test
    void rejectsInvalidIssueTypes() throws Exception {
        String admin = accessToken("boss");
        String types = on(boardId(admin), "/issue-type");

        mvc.perform(bearer(json(post(types), """
                {"label": "", "color": "#22a06b", "icon": "star"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Issue type name is required (max 30 characters)."));
        mvc.perform(bearer(json(post(types), """
                {"label": "Story", "color": "green", "icon": "star"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Issue type color must be a hex color like #4bade8."));
        mvc.perform(bearer(json(post(types), """
                {"label": "Story", "color": "#22a06b", "icon": "rocket"}"""), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Icon must be one of: check, bug, doc, bolt, star, flag, wrench, light-bulb."));
    }

    @Test
    void adminDeletesAnIssueTypeOnceNoCardUsesIt() throws Exception {
        String admin = accessToken("boss");
        String alice = accessToken("alice");
        String board = joinBoard(admin, alice);
        mvc.perform(bearer(json(post(on(board, "/issue-type")), NEW_TYPE), admin)).andExpect(status().isCreated());

        mvc.perform(bearer(delete(on(board, "/issue-type/user-story")), alice))
                .andExpect(status().isForbidden());

        mvc.perform(bearer(json(post(on(board, "/card")), """
                {"rating": 3, "comment": "As a user", "productId": "AJB-1", "type": "user-story"}"""), admin))
                .andExpect(status().isCreated());
        String cards = mvc.perform(bearer(get(on(board, "/card")), admin)).andReturn().getResponse().getContentAsString();
        String cardId = JsonPath.read(cards, "$[0]._id");
        mvc.perform(bearer(delete(on(board, "/issue-type/user-story")), admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cards still use this issue type. Change or delete them first."));

        mvc.perform(bearer(delete(on(board, "/card/" + cardId)), admin)).andExpect(status().isOk());
        mvc.perform(bearer(delete(on(board, "/issue-type/user-story")), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Issue type deleted."));
        mvc.perform(bearer(get(on(board, "/issue-type")), admin))
                .andExpect(jsonPath("$[*].key").value(contains("task", "bug", "doc")));
    }

    @Test
    void refusesToDeleteTheDefaultOrUnknownIssueTypes() throws Exception {
        String admin = accessToken("boss");
        String board = boardId(admin);

        mvc.perform(bearer(delete(on(board, "/issue-type/task")), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The default issue type cannot be deleted."));
        mvc.perform(bearer(delete(on(board, "/issue-type/epic")), admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Issue type not found."));
        mvc.perform(bearer(delete(on(board, "/issue-type/Not_a_key")), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid issue type."));
    }

    @Test
    void refusesMoreThanTwelveIssueTypes() throws Exception {
        String admin = accessToken("boss");
        String types = on(boardId(admin), "/issue-type");
        for (int i = 0; i < 9; i++) {
            mvc.perform(bearer(json(post(types), """
                    {"label": "Type %d", "color": "#22a06b", "icon": "star"}""".formatted(i)), admin))
                    .andExpect(status().isCreated());
        }

        mvc.perform(bearer(json(post(types), NEW_TYPE), admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("There can be at most 12 issue types."));
    }
}
