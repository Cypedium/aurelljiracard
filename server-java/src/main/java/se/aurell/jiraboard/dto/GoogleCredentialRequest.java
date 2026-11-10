package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The ID token from Google's sign-in button (POST /auth/google and /user/google). */
public record GoogleCredentialRequest(
        @NotBlank(message = "Google credential is required.")
        @Size(max = 4096, message = "Invalid Google credential.")
        String credential) {
}
