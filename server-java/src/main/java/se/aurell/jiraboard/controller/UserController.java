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
import se.aurell.jiraboard.dto.GoogleCredentialRequest;
import se.aurell.jiraboard.dto.LanguageRequest;
import se.aurell.jiraboard.dto.LanguageResponse;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.dto.UserUpdateRequest;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.entity.Layout;
import se.aurell.jiraboard.security.AdminOnly;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.security.RequiresFeature;
import se.aurell.jiraboard.service.UserService;

/** The logged-in user's own settings, plus user management for site admins (@AdminOnly, 403 for others). */
@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** Every user (id, name, picture, role); site admins also get lastActiveAt and online. */
    @GetMapping
    public List<?> getAll(@AuthenticationPrincipal AuthUser user) {
        return userService.getAll(user);
    }

    @GetMapping("/usernames")
    public List<String> getUsernames() {
        return userService.getUsernames();
    }

    /** The caller's saved card order; one layout for all their boards. */
    @GetMapping("/layout")
    public Layout getLayout(@AuthenticationPrincipal AuthUser user) {
        return userService.getLayout(user);
    }

    /** Fields left out keep their saved value. 400 for a card position whose status isn't a valid list key. */
    @PutMapping("/layout")
    public MessageResponse updateLayout(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody LayoutRequest request) {
        userService.updateLayout(user, request);
        return new MessageResponse("Layout updated successfully.");
    }

    // The UI language picked in the account menu (null until the user picks one)
    @GetMapping("/language")
    public LanguageResponse getLanguage(@AuthenticationPrincipal AuthUser user) {
        return new LanguageResponse(userService.getLanguage(user));
    }

    // The value is checked against the Language enum in UserService (400 otherwise)
    @PutMapping("/language")
    public LanguageResponse updateLanguage(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody LanguageRequest request) {
        return new LanguageResponse(userService.updateLanguage(user, request.language()));
    }

    // The logged-in user connects their Google account, so they can sign in with Google.
    // 409 when that Google account belongs to another user, or this user already has a different one
    @RequiresFeature(Feature.GOOGLE_CONNECT)
    @PostMapping("/google")
    public MessageResponse connectGoogle(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody GoogleCredentialRequest request) {
        userService.connectGoogle(user, request.credential());
        return new MessageResponse("Google account connected.");
    }

    /**
     * Site admin: renames and/or changes the role; either change logs the user out (tokenVersion) and cards
     * follow a rename. An admin cannot drop their own admin role (400); a taken name is 409.
     */
    @AdminOnly
    @PatchMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return userService.update(id, request, user);
    }

    /** Site admin: deletes a user with no cards whose own board has none (409 otherwise); never themselves (400). */
    @AdminOnly
    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable UUID id, @AuthenticationPrincipal AuthUser user) {
        userService.delete(id, user);
        return new MessageResponse("User deleted successfully.");
    }

    /** Site admin: logs the user out everywhere. Their current access token still works for up to 15 minutes. */
    @AdminOnly
    @PostMapping("/{id}/logout")
    public MessageResponse revokeSessions(@PathVariable UUID id) {
        userService.revokeSessions(id);
        return new MessageResponse("User logged out from all sessions.");
    }
}
