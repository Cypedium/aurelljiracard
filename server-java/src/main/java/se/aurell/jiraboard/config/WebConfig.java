package se.aurell.jiraboard.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import se.aurell.jiraboard.security.FeatureInterceptor;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FeatureInterceptor featureInterceptor;

    public WebConfig(FeatureInterceptor featureInterceptor) {
        this.featureInterceptor = featureInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Not on /error: a failed write is forwarded there and must keep its own status
        registry.addInterceptor(featureInterceptor).excludePathPatterns("/error");
    }
}
