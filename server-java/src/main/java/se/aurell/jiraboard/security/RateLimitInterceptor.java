package se.aurell.jiraboard.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import se.aurell.jiraboard.config.RateLimitProperties;
import se.aurell.jiraboard.exception.TooManyRequestsException;

/**
 * Applies {@code @RateLimited} per client IP before the controller runs. Throws TooManyRequestsException,
 * which GlobalExceptionHandler turns into 429 { message } with Retry-After.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    public static final String TOO_MANY_MESSAGE = "Too many attempts. Please try again in a few minutes.";

    private final RateLimiter rateLimiter;
    private final RateLimitProperties properties;

    public RateLimitInterceptor(RateLimiter rateLimiter, RateLimitProperties properties) {
        this.rateLimiter = rateLimiter;
        this.properties = properties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.enabled() || !(handler instanceof HandlerMethod method)) {
            return true;
        }
        RateLimited limited = method.getMethodAnnotation(RateLimited.class);
        if (limited != null) {
            long wait = rateLimiter.tryAcquire(limited.value(), clientIp(request));
            if (wait > 0) {
                throw new TooManyRequestsException(TOO_MANY_MESSAGE, wait);
            }
        }
        return true;
    }

    /** In production Fly's proxy sets Fly-Client-IP; locally (no header) the connection's address. */
    String clientIp(HttpServletRequest request) {
        String header = properties.clientIpHeader();
        String value = StringUtils.hasText(header) ? request.getHeader(header) : null;
        if (StringUtils.hasText(value)) {
            int comma = value.indexOf(',');
            return (comma < 0 ? value : value.substring(0, comma)).strip();
        }
        return request.getRemoteAddr();
    }
}
