package se.aurell.jiraboard.service;

import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import se.aurell.jiraboard.config.RateLimitProperties;
import se.aurell.jiraboard.exception.TooManyRequestsException;

/**
 * Failed password checks per account name (the username or email as typed, in any casing), in memory: after
 * 5 failures within 15 minutes the name is refused until the 15 minutes are over, whatever IP the attempts come
 * from. A temporary pause, not a lock: nobody can lock a user out for longer by typing wrong passwords. Names
 * without an account count the same way, so a 429 doesn't reveal whether the account exists.
 */
@Component
public class LoginAttempts {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final String TOO_MANY_FAILURES_MESSAGE = "Too many failed logins. Please try again in 15 minutes.";

    private final InstantSource clock;
    private final boolean enabled;
    private final Map<String, Failures> failures = new ConcurrentHashMap<>();
    private volatile Instant nextSweep;

    @Autowired
    public LoginAttempts(RateLimitProperties properties) {
        this(InstantSource.system(), properties.enabled());
    }

    LoginAttempts(InstantSource clock, boolean enabled) {
        this.clock = clock;
        this.enabled = enabled;
        this.nextSweep = clock.instant().plus(WINDOW);
    }

    /** 429 with Retry-After while the name has too many recent failures; checked before the password. */
    public void requireAllowed(String name) {
        if (!enabled) {
            return;
        }
        Instant now = clock.instant();
        Failures f = failures.get(key(name));
        if (f != null && f.count >= MAX_FAILURES && now.isBefore(f.end())) {
            throw new TooManyRequestsException(TOO_MANY_FAILURES_MESSAGE, Duration.between(now, f.end()).toSeconds() + 1);
        }
    }

    public void recordFailure(String name) {
        if (!enabled) {
            return;
        }
        Instant now = clock.instant();
        sweepIfDue(now);
        failures.compute(key(name), (k, f) -> f == null || !now.isBefore(f.end()) ? new Failures(now, 1)
                : new Failures(f.start, f.count + 1));
    }

    /** A correct password forgets the earlier failures. */
    public void recordSuccess(String name) {
        failures.remove(key(name));
    }

    private static String key(String name) {
        return name.strip().toLowerCase(Locale.ROOT);
    }

    private void sweepIfDue(Instant now) {
        if (now.isBefore(nextSweep)) {
            return;
        }
        nextSweep = now.plus(WINDOW);
        failures.values().removeIf(f -> !now.isBefore(f.end()));
    }

    int size() {
        return failures.size();
    }

    // The window starts at the first failure
    private record Failures(Instant start, int count) {
        Instant end() {
            return start.plus(WINDOW);
        }
    }
}
