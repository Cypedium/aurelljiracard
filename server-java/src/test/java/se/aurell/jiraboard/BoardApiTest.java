package se.aurell.jiraboard;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

class BoardApiTest extends ApiIntegrationTest {

    private String createInvite(String token, String board) throws Exception {
        return JsonPath.read(mvc.perform(bearer(post(on(board, "/invite")), token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.token");
    }

    private String idOf(String username) {
        return userRepository.findByUsername(username).orElseThrow().getId().toString();
    }

    @Test
    void everyNewUserOwnsABoard() throws Exception {
        mvc.perform(get("/board")).andExpect(status().isUnauthorized());

        mvc.perform(bearer(get("/board"), accessToken("alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0]._id").isString())
                .andExpect(jsonPath("$[0].name").value("alice's board"))
                .andExpect(jsonPath("$[0].owner").value("alice"))
                .andExpect(jsonPath("$[0].role").value("admin"));
    }

    @Test
    void anInviteLinkAddsACollaborator() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = boardId(alice);
        String token = createInvite(alice, board);
        // 32 random bytes, base64url
        org.hamcrest.MatcherAssert.assertThat(token, matchesPattern("^[A-Za-z0-9_-]{43}$"));

        mvc.perform(bearer(post("/invite/" + token), bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._id").value(board))
                .andExpect(jsonPath("$.name").value("alice's board"))
                .andExpect(jsonPath("$.role").value("user"));

        // bob's own board first, then the ones he collaborates on
        mvc.perform(bearer(get("/board"), bob))
                .andExpect(jsonPath("$[*].owner").value(contains("bob", "alice")))
                .andExpect(jsonPath("$[*].role").value(contains("admin", "user")));

        mvc.perform(bearer(get(on(board, "/member")), bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username").value(contains("alice", "bob")))
                .andExpect(jsonPath("$[*].role").value(contains("admin", "user")))
                .andExpect(jsonPath("$[0]._id").value(idOf("alice")));
    }

    @Test
    void joiningAgainOrYourOwnBoardChangesNothing() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = boardId(alice);
        String token = createInvite(alice, board);

        mvc.perform(bearer(post("/invite/" + token), bob)).andExpect(status().isOk());
        mvc.perform(bearer(post("/invite/" + token), bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("user"));
        mvc.perform(bearer(post("/invite/" + token), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("admin"));

        mvc.perform(bearer(get(on(board, "/member")), alice)).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void aNewLinkReplacesTheOldOneAndALinkCanBeTurnedOff() throws Exception {
        String alice = accessToken("alice");
        String board = boardId(alice);
        String first = createInvite(alice, board);
        String second = createInvite(alice, board);

        mvc.perform(bearer(post("/invite/" + first), accessToken("bob")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("This invite link is invalid or has been turned off."));
        mvc.perform(bearer(post("/invite/" + second), accessToken("carol"))).andExpect(status().isOk());

        mvc.perform(bearer(delete(on(board, "/invite")), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Invite link turned off."));
        mvc.perform(bearer(post("/invite/" + second), accessToken("dave"))).andExpect(status().isNotFound());
        // carol, who already joined, stays
        mvc.perform(bearer(get(on(board, "/member")), alice)).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void invalidInviteTokens() throws Exception {
        String bob = accessToken("bob");

        mvc.perform(bearer(post("/invite/nope"), bob)).andExpect(status().isNotFound());
        mvc.perform(bearer(post("/invite/" + "x".repeat(101)), bob)).andExpect(status().isNotFound());
        mvc.perform(post("/invite/nope")).andExpect(status().isUnauthorized());
    }

    @Test
    void onlyTheBoardAdminManagesInvites() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);

        mvc.perform(bearer(post(on(board, "/invite")), bob))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Board admins only."));
        mvc.perform(bearer(delete(on(board, "/invite")), bob)).andExpect(status().isForbidden());
        // A stranger can't tell the board exists
        mvc.perform(bearer(post(on(board, "/invite")), accessToken("carol")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Board not found."));
    }

    @Test
    void theAdminRemovesACollaboratorWhoThenLosesAccess() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String carol = accessToken("carol");
        String board = joinBoard(alice, bob);
        joinBoard(alice, carol);

        // Collaborators can't remove each other
        mvc.perform(bearer(delete(on(board, "/member/" + idOf("carol"))), bob))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Board admins only."));

        mvc.perform(bearer(delete(on(board, "/member/" + idOf("bob"))), alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Member removed."));
        mvc.perform(bearer(get(on(board, "/card")), bob)).andExpect(status().isNotFound());
        mvc.perform(bearer(get("/board"), bob)).andExpect(jsonPath("$", hasSize(1)));

        mvc.perform(bearer(delete(on(board, "/member/" + idOf("bob"))), alice))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Member not found."));
    }

    @Test
    void aCollaboratorCanLeaveButTheOwnerCannot() throws Exception {
        String alice = accessToken("alice");
        String bob = accessToken("bob");
        String board = joinBoard(alice, bob);

        mvc.perform(bearer(delete(on(board, "/member/" + idOf("alice"))), alice))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot leave your own board."));

        mvc.perform(bearer(delete(on(board, "/member/" + idOf("bob"))), bob)).andExpect(status().isOk());
        mvc.perform(bearer(get(on(board, "/member")), alice)).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void membersAreOnlyVisibleToMembers() throws Exception {
        String board = boardId(accessToken("alice"));

        mvc.perform(bearer(get(on(board, "/member")), accessToken("bob")))
                .andExpect(status().isNotFound());
        mvc.perform(bearer(delete(on(board, "/member/not-a-uuid")), accessToken("carol")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid user id."));
    }
}
