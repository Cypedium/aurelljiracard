package se.aurell.jiraboard.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.service.FeatureService;

/**
 * Feature switches and read-only mode (flowchart in docs/feature-switches.md, section 3). Runs after Spring
 * Security, before the controller. Site admins are never blocked. Plain GETs without @RequiresFeature don't
 * touch the database. Throws ApiException (503), which GlobalExceptionHandler turns into { message }.
 */
@Component
public class FeatureInterceptor implements HandlerInterceptor {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final FeatureService featureService;

    public FeatureInterceptor(FeatureService featureService) {
        this.featureService = featureService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method) || isSiteAdmin()) {
            return true;
        }
        boolean write = WRITE_METHODS.contains(request.getMethod()) && !isReadOnlyExempt(method);
        RequiresFeature required = method.getMethodAnnotation(RequiresFeature.class);
        Feature feature = required == null ? null : required.value();
        if (write || feature != null) {
            featureService.requireAllowed(write, feature);
        }
        return true;
    }

    // @AdminOnly: admins are exempt anyway, and everyone else should get 403 "Admins only.", not 503
    public static boolean isReadOnlyExempt(HandlerMethod method) {
        return method.hasMethodAnnotation(ReadOnlyExempt.class)
                || AnnotatedElementUtils.hasAnnotation(method.getMethod(), AdminOnly.class);
    }

    private static boolean isSiteAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser user && user.isAdmin();
    }
}
