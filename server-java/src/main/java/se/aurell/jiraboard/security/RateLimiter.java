package se.aurell.jiraboard.security;

import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * A token bucket per limit and client IP, in memory: {@link RateLimit#requests()} requests at once, refilled
 * evenly over {@link RateLimit#period()}. Idle buckets (full again) are dropped now and then.
 */
@Component
public class RateLimiter {

    private static final Duration SWEEP_INTERVAL = Duration.ofMinutes(10);

    private final InstantSource clock;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private volatile Instant nextSweep;

    @Autowired
    public RateLimiter() {
        this(InstantSource.system());
    }

    RateLimiter(InstantSource clock) {
        this.clock = clock;
        this.nextSweep = clock.instant().plus(SWEEP_INTERVAL);
    }

    /** Takes one request from the client's allowance: 0 if allowed, otherwise the seconds until it is. */
    public long tryAcquire(RateLimit limit, String client) {
        Instant now = clock.instant();
        sweepIfDue(now);
        long[] waitSeconds = {0};
        buckets.compute(limit.name() + ' ' + client, (key, bucket) -> {
            Bucket b = bucket == null ? new Bucket(limit.requests(), now) : bucket;
            waitSeconds[0] = b.take(limit, now);
            return b;
        });
        return waitSeconds[0];
    }

    private void sweepIfDue(Instant now) {
        if (now.isBefore(nextSweep)) {
            return;
        }
        nextSweep = now.plus(SWEEP_INTERVAL);
        // A bucket untouched for longer than the longest period is full again: the same as no bucket
        Instant idleSince = now.minus(RateLimit.REGISTER.period());
        buckets.values().removeIf(b -> b.lastUsed.isBefore(idleSince));
    }

    int size() {
        return buckets.size();
    }

    // Guarded by ConcurrentHashMap.compute
    private static final class Bucket {
        private double tokens;
        private Instant lastUsed;

        Bucket(double tokens, Instant now) {
            this.tokens = tokens;
            this.lastUsed = now;
        }

        long take(RateLimit limit, Instant now) {
            double periodNanos = limit.period().toNanos();
            double elapsed = Math.max(0, Duration.between(lastUsed, now).toNanos());
            tokens = Math.min(limit.requests(), tokens + elapsed * limit.requests() / periodNanos);
            lastUsed = now;
            if (tokens >= 1) {
                tokens -= 1;
                return 0;
            }
            // Until one whole token has come back, rounded up to whole seconds
            long waitNanos = (long) Math.ceil((1 - tokens) * periodNanos / limit.requests());
            return (waitNanos + 999_999_999) / 1_000_000_000;
        }
    }
}
