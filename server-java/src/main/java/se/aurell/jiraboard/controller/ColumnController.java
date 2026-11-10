package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
import se.aurell.jiraboard.security.AdminOnly;
import se.aurell.jiraboard.service.ColumnService;

@RestController
@RequestMapping("/column")
public class ColumnController {

    private final ColumnService columnService;

    public ColumnController(ColumnService columnService) {
        this.columnService = columnService;
    }

    @GetMapping
    public List<ColumnResponse> getAll() {
        return columnService.getAll();
    }

    @AdminOnly
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ColumnResponse create(@Valid @RequestBody ColumnRequest request) {
        return columnService.create(request);
    }

    /** Admin: moves lists; body {@code {"keys": [...]}} with every list key in the new order. */
    @AdminOnly
    @PutMapping
    public List<ColumnResponse> reorder(@Valid @RequestBody ColumnOrderRequest request) {
        return columnService.reorder(request);
    }

    @AdminOnly
    @PutMapping("/{key}")
    public ColumnResponse update(@PathVariable String key, @Valid @RequestBody ColumnRequest request) {
        return columnService.update(key, request);
    }

    /** Admin: deletes an empty list; never the default list (todo). */
    @AdminOnly
    @DeleteMapping("/{key}")
    public MessageResponse delete(@PathVariable String key) {
        columnService.delete(key);
        return new MessageResponse("List deleted.");
    }
}
