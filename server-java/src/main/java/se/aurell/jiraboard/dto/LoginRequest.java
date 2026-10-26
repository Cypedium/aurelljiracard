package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotNull(message = "Username and password are required.") String username,
        @NotNull(message = "Username and password are required.") String password) {
}
