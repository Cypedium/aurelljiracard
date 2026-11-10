package se.aurell.jiraboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GOOGLE_CLIENT_ID: the OAuth client id from Google Cloud Console (not a secret; the frontend
 * uses the same id as NEXT_PUBLIC_GOOGLE_CLIENT_ID). Empty = Google sign-in is turned off.
 */
@ConfigurationProperties("app.google")
public record GoogleProperties(String clientId) {
}
