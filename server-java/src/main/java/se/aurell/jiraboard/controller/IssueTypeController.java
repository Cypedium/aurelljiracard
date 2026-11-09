package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.IssueTypeRequest;
import se.aurell.jiraboard.dto.IssueTypeResponse;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.IssueTypeService;

@RestController
@RequestMapping("/issue-type")
public class IssueTypeController {

    private final IssueTypeService issueTypeService;

    public IssueTypeController(IssueTypeService issueTypeService) {
        this.issueTypeService = issueTypeService;
    }

    @GetMapping
    public List<IssueTypeResponse> getAll() {
        return issueTypeService.getAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueTypeResponse create(@Valid @RequestBody IssueTypeRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return issueTypeService.create(request, user);
    }
}
