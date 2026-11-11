package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.ColumnOrderRequest;
import se.aurell.jiraboard.dto.ColumnRequest;
import se.aurell.jiraboard.dto.ColumnResponse;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.ColumnService;

/** A board's lists; members read them, the board admin changes them (checked in ColumnService). */
@RestController
@RequestMapping("/board/{boardId}/column")
public class ColumnController {

    private final ColumnService columnService;

    public ColumnController(ColumnService columnService) {
        this.columnService = columnService;
    }

    @GetMapping
    public List<ColumnResponse> getAll(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return columnService.getAll(boardId, user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ColumnResponse create(@PathVariable UUID boardId, @Valid @RequestBody ColumnRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return columnService.create(boardId, request, user);
    }

    /** Board admin: moves lists; body {@code {"keys": [...]}} with every list key in the new order. */
    @PutMapping
    public List<ColumnResponse> reorder(@PathVariable UUID boardId, @Valid @RequestBody ColumnOrderRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return columnService.reorder(boardId, request, user);
    }

    @PutMapping("/{key}")
    public ColumnResponse update(@PathVariable UUID boardId, @PathVariable String key,
            @Valid @RequestBody ColumnRequest request, @AuthenticationPrincipal AuthUser user) {
        return columnService.update(boardId, key, request, user);
    }

    /** Board admin: deletes an empty list; never the default list (todo). */
    @DeleteMapping("/{key}")
    public MessageResponse delete(@PathVariable UUID boardId, @PathVariable String key,
            @AuthenticationPrincipal AuthUser user) {
        columnService.delete(boardId, key, user);
        return new MessageResponse("List deleted.");
    }
}
