package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.dto.UserUpdateRequest;
import se.aurell.jiraboard.entity.Layout;
import se.aurell.jiraboard.security.AdminOnly;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.UserService;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<?> getAll(@AuthenticationPrincipal AuthUser user) {
        return userService.getAll(user);
    }

    @GetMapping("/usernames")
    public List<String> getUsernames() {
        return userService.getUsernames();
    }

    @GetMapping("/layout")
    public Layout getLayout(@AuthenticationPrincipal AuthUser user) {
        return userService.getLayout(user);
    }

    @PutMapping("/layout")
    public MessageResponse updateLayout(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody LayoutRequest request) {
        userService.updateLayout(user, request);
        return new MessageResponse("Layout updated successfully.");
    }

    // Admin: rename, change role, delete, or log a user out everywhere
    @AdminOnly
    @PatchMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return userService.update(id, request, user);
    }

    @AdminOnly
    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id, @AuthenticationPrincipal AuthUser user) {
        userService.delete(id, user);
        return new MessageResponse("User deleted successfully.");
    }

    @AdminOnly
    @PostMapping("/{id}/logout")
    public MessageResponse revokeSessions(@PathVariable UUID id) {
        userService.revokeSessions(id);
        return new MessageResponse("User logged out from all sessions.");
    }
}
