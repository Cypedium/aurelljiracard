package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.CardRequest;
import se.aurell.jiraboard.dto.CardResponse;
import se.aurell.jiraboard.dto.CardStatusRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.security.RequiresFeature;
import se.aurell.jiraboard.service.CardService;

/** Cards on one board; access is checked in CardService. */
@RestController
@RequestMapping("/board/{boardId}/card")
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    /** Every member: all cards on the board, newest first. Non-members get 404 "Board not found.". */
    @GetMapping
    public List<CardResponse> getAll(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return cardService.getAll(boardId, user);
    }

    /**
     * Every member. Field rules in CardRequest (400); type and status are checked against the board's issue
     * types and lists (400); the issue key must be unique on the board (409). Author and date come from the
     * token and the server clock, never from the body.
     */
    @RequiresFeature(Feature.CREATE_CARD)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse create(@PathVariable UUID boardId, @Valid @RequestBody CardRequest request,
            @AuthenticationPrincipal AuthUser user) {
        cardService.create(boardId, request, user);
        return new MessageResponse("Card saved successfully!");
    }

    /**
     * Every member may edit any card: priority, summary, issue key and type. Status changes go through
     * PATCH …/status; author and date never change. A card on another board is 404 "Card not found.".
     */
    @RequiresFeature(Feature.EDIT_CARD)
    @PutMapping("/{id}")
    public CardResponse update(@PathVariable UUID boardId, @PathVariable UUID id,
            @Valid @RequestBody CardRequest request, @AuthenticationPrincipal AuthUser user) {
        return cardService.update(boardId, id, request, user);
    }

    /**
     * Every member moves a card to a list or the backlog (400 for an unknown status). Taking a card out of the
     * backlog assigns it to the caller; moving it into the backlog unassigns it.
     */
    @RequiresFeature(Feature.EDIT_CARD)
    @PatchMapping("/{id}/status")
    public CardResponse updateStatus(@PathVariable UUID boardId, @PathVariable UUID id,
            @Valid @RequestBody CardStatusRequest request, @AuthenticationPrincipal AuthUser user) {
        return cardService.updateStatus(boardId, id, request.status(), user);
    }

    /** The card's author or the board admin; other members get 403 "You can only delete your own card.". */
    @RequiresFeature(Feature.DELETE_CARD)
    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID boardId, @PathVariable UUID id,
            @AuthenticationPrincipal AuthUser user) {
        cardService.delete(boardId, id, user);
        return new MessageResponse("Card deleted successfully.");
    }
}
