package se.aurell.jiraboard.dto;

/** Body of /auth/refresh and /auth/logout; a missing token is handled per endpoint. */
public record RefreshTokenRequest(String refreshToken) {
}
