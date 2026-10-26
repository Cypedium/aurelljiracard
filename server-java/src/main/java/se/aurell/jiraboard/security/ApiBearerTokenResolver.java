package se.aurell.jiraboard.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Ignores the Authorization header on public routes. The frontend also sends its (possibly
 * expired) access token to /auth/logout, which must not fail with 401, as in the Express API.
 */
public class ApiBearerTokenResolver implements BearerTokenResolver {

    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/auth/") || path.equals("/health")) {
            return null;
        }
        return delegate.resolve(request);
    }
}
