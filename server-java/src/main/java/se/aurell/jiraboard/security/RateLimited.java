package se.aurell.jiraboard.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Limits how often one client IP may call the handler (RateLimitInterceptor); over the limit = 429
 * "Too many attempts. Please try again in a few minutes." with Retry-After. FeatureCoverageTest pins the handlers.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
    RateLimit value();
}
