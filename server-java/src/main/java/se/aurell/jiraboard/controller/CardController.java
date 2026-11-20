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

    @GetMapping
    public List<CardResponse> getAll(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return cardService.getAll(boardId, user);
    }

    @RequiresFeature(Feature.CREATE_CARD)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse create(@PathVariable UUID boardId, @Valid @RequestBody CardRequest request,
            @AuthenticationPrincipal AuthUser user) {
        cardService.create(boardId, request, user);
        return new MessageResponse("Card saved successfully!");
    }

    @RequiresFeature(Feature.EDIT_CARD)
    @PutMapping("/{id}")
    public CardResponse update(@PathVariable UUID boardId, @PathVariable UUID id,
            @Valid @RequestBody CardRequest request, @AuthenticationPrincipal AuthUser user) {
        return cardService.update(boardId, id, request, user);
    }

    @RequiresFeature(Feature.EDIT_CARD)
    @PatchMapping("/{id}/status")
    public CardResponse updateStatus(@PathVariable UUID boardId, @PathVariable UUID id,
            @Valid @RequestBody CardStatusRequest request, @AuthenticationPrincipal AuthUser user) {
        return cardService.updateStatus(boardId, id, request.status(), user);
    }

    @RequiresFeature(Feature.DELETE_CARD)
    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID boardId, @PathVariable UUID id,
            @AuthenticationPrincipal AuthUser user) {
        cardService.delete(boardId, id, user);
        return new MessageResponse("Card deleted successfully.");
    }
}
