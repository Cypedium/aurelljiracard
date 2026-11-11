package se.aurell.jiraboard.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.BoardMemberResponse;
import se.aurell.jiraboard.dto.BoardResponse;
import se.aurell.jiraboard.dto.InviteResponse;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.BoardService;

/** Boards, their members and invite links; access is checked in BoardService. */
@RestController
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/board")
    public List<BoardResponse> getMine(@AuthenticationPrincipal AuthUser user) {
        return boardService.getMine(user);
    }

    /** Board admin: a new invite link (the old one stops working). */
    @PostMapping("/board/{boardId}/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteResponse createInvite(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return boardService.createInvite(boardId, user);
    }

    @DeleteMapping("/board/{boardId}/invite")
    public MessageResponse deleteInvite(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        boardService.deleteInvite(boardId, user);
        return new MessageResponse("Invite link turned off.");
    }

    @GetMapping("/board/{boardId}/member")
    public List<BoardMemberResponse> getMembers(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return boardService.getMembers(boardId, user);
    }

    /** The board admin removes a collaborator, or a collaborator removes themselves (leaves). */
    @DeleteMapping("/board/{boardId}/member/{userId}")
    public MessageResponse removeMember(@PathVariable UUID boardId, @PathVariable UUID userId,
            @AuthenticationPrincipal AuthUser user) {
        boardService.removeMember(boardId, userId, user);
        return new MessageResponse("Member removed.");
    }

    /** Any logged-in user: joins the board behind the link as a collaborator. */
    @PostMapping("/invite/{token}")
    public BoardResponse join(@PathVariable String token, @AuthenticationPrincipal AuthUser user) {
        return boardService.join(token, user);
    }
}
