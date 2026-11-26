package se.aurell.jiraboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import se.aurell.jiraboard.exception.TooManyRequestsException;

class LoginAttemptsTest {

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-26T12:00:00Z"));
    private final LoginAttempts attempts = new LoginAttempts((InstantSource) now::get, true);

    private void fail(String name, int times) {
        for (int i = 0; i < times; i++) {
            attempts.recordFailure(name);
        }
    }

    @Test
    void fiveFailuresPauseTheNameInAnyCasing() {
        fail("Alice", LoginAttempts.MAX_FAILURES - 1);
        assertThatCode(() -> attempts.requireAllowed("alice")).doesNotThrowAnyException();

        attempts.recordFailure("ALICE");
        assertThatThrownBy(() -> attempts.requireAllowed(" alice "))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage(LoginAttempts.TOO_MANY_FAILURES_MESSAGE)
                .extracting(e -> ((TooManyRequestsException) e).getRetryAfterSeconds())
                .isEqualTo(LoginAttempts.WINDOW.toSeconds() + 1);
        assertThatCode(() -> attempts.requireAllowed("bob")).doesNotThrowAnyException();
    }

    @Test
    void thePauseEndsFifteenMinutesAfterTheFirstFailure() {
        fail("alice", 1);
        now.updateAndGet(t -> t.plus(Duration.ofMinutes(10)));
        fail("alice", LoginAttempts.MAX_FAILURES - 1);
        assertThatThrownBy(() -> attempts.requireAllowed("alice")).isInstanceOf(TooManyRequestsException.class);

        now.updateAndGet(t -> t.plus(Duration.ofMinutes(5)));
        assertThatCode(() -> attempts.requireAllowed("alice")).doesNotThrowAnyException();
        // A new window: one failure isn't enough to pause again
        fail("alice", 1);
        assertThatCode(() -> attempts.requireAllowed("alice")).doesNotThrowAnyException();
    }

    @Test
    void aCorrectPasswordForgetsTheFailures() {
        fail("alice", LoginAttempts.MAX_FAILURES - 1);
        attempts.recordSuccess("alice");
        fail("alice", LoginAttempts.MAX_FAILURES - 1);

        assertThatCode(() -> attempts.requireAllowed("alice")).doesNotThrowAnyException();
    }

    @Test
    void oldFailuresAreForgotten() {
        fail("alice", 1);
        now.updateAndGet(t -> t.plus(LoginAttempts.WINDOW));
        fail("bob", 1);

        assertThat(attempts.size()).isEqualTo(1);
    }

    @Test
    void offMeansNoPause() {
        LoginAttempts off = new LoginAttempts((InstantSource) now::get, false);
        for (int i = 0; i < 10; i++) {
            off.recordFailure("alice");
        }
        assertThatCode(() -> off.requireAllowed("alice")).doesNotThrowAnyException();
    }
}
