package se.aurell.jiraboard.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Only admins may call the annotated endpoint (requireAdmin.js in Express). Others get
 * 403 "Admins only." from GlobalExceptionHandler. The role comes from the access token
 * ({@link AccessTokenConverter}), so a new role takes effect at the next token refresh.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@PreAuthorize("hasRole('ADMIN')")
public @interface AdminOnly {
}
