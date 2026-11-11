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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.IssueTypeRequest;
import se.aurell.jiraboard.dto.IssueTypeResponse;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.IssueTypeService;

/** A board's issue types; members read them, the board admin changes them (checked in IssueTypeService). */
@RestController
@RequestMapping("/board/{boardId}/issue-type")
public class IssueTypeController {

    private final IssueTypeService issueTypeService;

    public IssueTypeController(IssueTypeService issueTypeService) {
        this.issueTypeService = issueTypeService;
    }

    @GetMapping
    public List<IssueTypeResponse> getAll(@PathVariable UUID boardId, @AuthenticationPrincipal AuthUser user) {
        return issueTypeService.getAll(boardId, user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueTypeResponse create(@PathVariable UUID boardId, @Valid @RequestBody IssueTypeRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return issueTypeService.create(boardId, request, user);
    }

    @DeleteMapping("/{key}")
    public MessageResponse delete(@PathVariable UUID boardId, @PathVariable String key,
            @AuthenticationPrincipal AuthUser user) {
        issueTypeService.delete(boardId, key, user);
        return new MessageResponse("Issue type deleted.");
    }
}
