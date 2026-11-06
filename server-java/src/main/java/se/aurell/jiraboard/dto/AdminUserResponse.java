package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import se.aurell.jiraboard.entity.Role;

/**
 * User info for admins: also when the user was last active and whether they are online.
 * Used as a JPQL projection (the second constructor), so the layout column is never loaded.
 */
public record AdminUserResponse(
        @JsonProperty("_id") UUID id,
        String username,
        String pictureUrl,
        Role role,
        Instant lastActiveAt,
        boolean online) {

    /**
     * An active user refreshes shortly after the 15-minute access token expires.
     * Must match ONLINE_WINDOW_MS in server/utils/presence.js
     */
    static final Duration ONLINE_WINDOW = Duration.ofMinutes(20);

    public AdminUserResponse(
            UUID id, String username, String pictureUrl, Role role, Instant lastActiveAt, Instant loggedOutAt) {
        this(id, username, pictureUrl, role, lastActiveAt, isOnline(lastActiveAt, loggedOutAt, Instant.now()));
    }

    /** Active within the window and not logged out since. */
    static boolean isOnline(Instant lastActiveAt, Instant loggedOutAt, Instant now) {
        if (lastActiveAt == null || lastActiveAt.isBefore(now.minus(ONLINE_WINDOW))) {
            return false;
        }
        return loggedOutAt == null || loggedOutAt.isBefore(lastActiveAt);
    }
}
