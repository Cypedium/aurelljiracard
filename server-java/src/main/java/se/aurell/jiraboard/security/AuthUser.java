package se.aurell.jiraboard.security;

import java.util.UUID;
import se.aurell.jiraboard.entity.Role;

/** The logged-in user, taken from the verified access token (never from the request body). */
public record AuthUser(UUID id, String username, Role role) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
