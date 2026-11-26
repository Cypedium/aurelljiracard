package se.aurell.jiraboard.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-26T12:00:00Z"));
    // A clock the test moves forward
    private final RateLimiter limiter = new RateLimiter((InstantSource) now::get);

    private void advance(Duration d) {
        now.updateAndGet(t -> t.plus(d));
    }

    @Test
    void allowsTheLimitThenTellsHowLongToWait() {
        for (int i = 0; i < RateLimit.LOGIN.requests(); i++) {
            assertThat(limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4")).isZero();
        }
        // 10 per minute: one request comes back every 6 seconds
        assertThat(limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4")).isEqualTo(6);

        advance(Duration.ofSeconds(6));
        assertThat(limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4")).isZero();
        assertThat(limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4")).isPositive();
    }

    @Test
    void clientsAndLimitsCountSeparately() {
        for (int i = 0; i < RateLimit.EMAIL.requests(); i++) {
            limiter.tryAcquire(RateLimit.EMAIL, "1.2.3.4");
        }
        assertThat(limiter.tryAcquire(RateLimit.EMAIL, "1.2.3.4")).isPositive();
        assertThat(limiter.tryAcquire(RateLimit.EMAIL, "5.6.7.8")).isZero();
        assertThat(limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4")).isZero();
    }

    @Test
    void aFullPeriodRefillsEverything() {
        for (int i = 0; i < RateLimit.REGISTER.requests(); i++) {
            limiter.tryAcquire(RateLimit.REGISTER, "1.2.3.4");
        }
        advance(RateLimit.REGISTER.period());
        for (int i = 0; i < RateLimit.REGISTER.requests(); i++) {
            assertThat(limiter.tryAcquire(RateLimit.REGISTER, "1.2.3.4")).isZero();
        }
    }

    @Test
    void idleClientsAreForgotten() {
        limiter.tryAcquire(RateLimit.LOGIN, "1.2.3.4");
        assertThat(limiter.size()).isEqualTo(1);

        advance(RateLimit.REGISTER.period().plusMinutes(1));
        limiter.tryAcquire(RateLimit.LOGIN, "5.6.7.8");
        assertThat(limiter.size()).isEqualTo(1);
    }
}
