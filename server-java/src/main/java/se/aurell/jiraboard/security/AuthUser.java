package se.aurell.jiraboard.security;

import java.util.UUID;

/** The logged-in user, taken from the verified access token (never from the request body). */
public record AuthUser(UUID id, String username) {
}
