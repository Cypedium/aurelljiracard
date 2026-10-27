package se.aurell.jiraboard.dto;

/** The frontend stores both tokens in localStorage, so they are returned in the body. */
public record TokenResponse(String accessToken, String refreshToken) {
}
