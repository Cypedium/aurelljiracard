package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of PATCH /user/{id} (admins only). Fields left out keep their value.
 * {@code role} is checked in UserService so unknown values get the same message as server/.
 */
public record UserUpdateRequest(
        // Not blank, but not trimmed: usernames are stored as typed
        @Size(max = 32, message = USERNAME_MESSAGE)
        @Pattern(regexp = "(?s).*\\S.*", message = USERNAME_MESSAGE)
        String username,

        String role) {

    static final String USERNAME_MESSAGE = "Username is required (max 32 characters).";
}
