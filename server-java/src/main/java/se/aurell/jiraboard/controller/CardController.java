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
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.CardService;

@RestController
@RequestMapping("/card")
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping
    public List<CardResponse> getAll() {
        return cardService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse create(@Valid @RequestBody CardRequest request, @AuthenticationPrincipal AuthUser user) {
        cardService.create(request, user);
        return new MessageResponse("Card saved successfully!");
    }

    @PutMapping("/{id}")
    public CardResponse update(@PathVariable UUID id, @Valid @RequestBody CardRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return cardService.update(id, request, user);
    }

    @PatchMapping("/{id}/status")
    public CardResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody CardStatusRequest request) {
        return cardService.updateStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id, @AuthenticationPrincipal AuthUser user) {
        cardService.delete(id, user);
        return new MessageResponse("Card deleted successfully.");
    }
}
