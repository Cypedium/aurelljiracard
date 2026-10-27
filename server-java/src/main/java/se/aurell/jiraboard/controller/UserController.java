package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.entity.Layout;
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
    public List<UserResponse> getAll() {
        return userService.getAll();
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
}
