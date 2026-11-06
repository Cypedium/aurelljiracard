package se.aurell.jiraboard.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class AdminUserResponseTest {

    private static final Instant NOW = Instant.parse("2026-11-06T12:00:00Z");

    private static Instant ago(Duration d) {
        return NOW.minus(d);
    }

    @Test
    void onlineWhenActiveWithinWindowAndNotLoggedOutSince() {
        assertThat(AdminUserResponse.isOnline(ago(Duration.ofMinutes(1)), null, NOW)).isTrue();
        assertThat(AdminUserResponse.isOnline(ago(Duration.ofMinutes(1)), ago(Duration.ofMinutes(5)), NOW)).isTrue();
    }

    @Test
    void offlineAfterLogout() {
        assertThat(AdminUserResponse.isOnline(ago(Duration.ofMinutes(5)), ago(Duration.ofMinutes(1)), NOW)).isFalse();
    }

    @Test
    void offlineWhenLastActiveBeforeWindowOrNever() {
        assertThat(AdminUserResponse.isOnline(
                ago(AdminUserResponse.ONLINE_WINDOW.plusSeconds(1)), null, NOW)).isFalse();
        assertThat(AdminUserResponse.isOnline(null, null, NOW)).isFalse();
    }
}
