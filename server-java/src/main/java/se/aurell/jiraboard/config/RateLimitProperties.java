package se.aurell.jiraboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Rate limits on the public /auth endpoints (per client IP) and on failed logins (per account). Counted in
 * memory, so each machine counts on its own and a restart starts over.
 * enabled: RATE_LIMIT_ENABLED, default true; the API tests turn it off except in RateLimitApiTest.
 * clientIpHeader: the header with the caller's address (Fly's proxy sets Fly-Client-IP); without it the
 * connection's address is used.
 */
@ConfigurationProperties("app.rate-limit")
public record RateLimitProperties(boolean enabled, String clientIpHeader) {
}
