package se.aurell.jiraboard.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Allowed frontend origins, from CLIENT_URL (comma-separated). */
@ConfigurationProperties("app.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
