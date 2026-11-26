package se.aurell.jiraboard.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import se.aurell.jiraboard.security.FeatureInterceptor;
import se.aurell.jiraboard.security.RateLimitInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;
    private final FeatureInterceptor featureInterceptor;

    public WebConfig(RateLimitInterceptor rateLimitInterceptor, FeatureInterceptor featureInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
        this.featureInterceptor = featureInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Not on /error: a failed request is forwarded there and must keep its own status.
        // Rate limits first, so a blocked client doesn't reach the feature switch lookup
        registry.addInterceptor(rateLimitInterceptor).excludePathPatterns("/error");
        registry.addInterceptor(featureInterceptor).excludePathPatterns("/error");
    }
}
