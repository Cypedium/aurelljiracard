package se.aurell.jiraboard.security;

import java.time.Duration;

/**
 * The per-IP limits of the public /auth endpoints ({@code @RateLimited}). Endpoints with the same limit share
 * one allowance per IP: forgot-password and verification-email together send at most 5 emails per 15 minutes.
 */
public enum RateLimit {
    // Password guessing
    LOGIN(10, Duration.ofMinutes(1)),
    // Bots creating accounts (and making us send emails)
    REGISTER(5, Duration.ofHours(1)),
    // Flooding inboxes, which also uses up the Resend quota and the domain's reputation
    EMAIL(5, Duration.ofMinutes(15)),
    // Guessing the tokens in emailed links (practically impossible, but cheap to stop)
    LINK(20, Duration.ofMinutes(15)),
    // Google sign-in and token refresh: generous, a page reload refreshes once
    SESSION(30, Duration.ofMinutes(1));

    private final int requests;
    private final Duration period;

    RateLimit(int requests, Duration period) {
        this.requests = requests;
        this.period = period;
    }

    public int requests() {
        return requests;
    }

    public Duration period() {
        return period;
    }
}
