package se.aurell.jiraboard.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A write that keeps working in read-only mode: login, refresh, logout and Google sign-in (which checks
 * user creation itself). @AdminOnly endpoints are exempt without it (FeatureInterceptor).
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ReadOnlyExempt {
}
