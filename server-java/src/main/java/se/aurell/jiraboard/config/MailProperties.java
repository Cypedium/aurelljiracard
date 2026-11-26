package se.aurell.jiraboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Sending email through Resend (https://resend.com).
 * resendApiKey: RESEND_API_KEY, a secret; empty = registration and verification emails answer 503.
 * from: MAIL_FROM, e.g. "AurellTodo &lt;noreply@your-domain&gt;"; the domain must be verified in Resend.
 * appUrl: APP_URL, the frontend's address; verification links point to {appUrl}/verify-email/{token}.
 */
@ConfigurationProperties("app.mail")
public record MailProperties(String resendApiKey, String from, String appUrl) {
}
