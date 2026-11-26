package se.aurell.jiraboard.service;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.HtmlUtils;
import se.aurell.jiraboard.config.MailProperties;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.exception.ApiException;

/** Sends the verification email through Resend's HTTP API (no SDK). Tests replace this bean with a mock. */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);
    private static final String RESEND_URL = "https://api.resend.com/emails";

    static final String NOT_CONFIGURED_MESSAGE = "Email is not configured.";
    static final String SEND_FAILED_MESSAGE = "Could not send the email. Please try again later.";

    private final MailProperties properties;
    private final RestClient client;

    public EmailSender(MailProperties properties) {
        this.properties = properties;
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().requestFactory(requestFactory).build();
    }

    /** The link the email points to; the frontend's /verify-email/[token] page posts the token. */
    public String verificationLink(String token) {
        return StringUtils.trimTrailingCharacter(properties.appUrl(), '/') + "/verify-email/" + token;
    }

    /**
     * @throws ApiException 503 if RESEND_API_KEY or MAIL_FROM is not set, or Resend refuses or can't be reached
     *         (the caller's transaction rolls back, so the user can simply try again)
     */
    public void sendVerification(String to, String username, String link, Language language) {
        if (!StringUtils.hasText(properties.resendApiKey()) || !StringUtils.hasText(properties.from())) {
            throw ApiException.serviceUnavailable(NOT_CONFIGURED_MESSAGE);
        }
        Text text = language == Language.SV ? Text.SV : Text.EN;
        String name = HtmlUtils.htmlEscape(username);
        String href = HtmlUtils.htmlEscape(link);
        String html = "<p>" + text.greeting + " " + name + ",</p>"
                + "<p>" + text.body + "</p>"
                + "<p><a href=\"" + href + "\">" + text.button + "</a></p>"
                + "<p style=\"color:#44546f;font-size:13px\">" + text.footer + "</p>";
        String plain = text.greeting + " " + username + ",\n\n" + text.body + "\n\n" + link + "\n\n" + text.footer;
        try {
            client.post()
                    .uri(RESEND_URL)
                    .header("Authorization", "Bearer " + properties.resendApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("from", properties.from(), "to", List.of(to), "subject", text.subject,
                            "html", html, "text", plain))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            // Only the status: the response may echo the address
            log.warn("Resend refused the verification email: HTTP {}", e.getStatusCode().value());
            throw ApiException.serviceUnavailable(SEND_FAILED_MESSAGE);
        } catch (RestClientException e) {
            log.warn("Resend could not be reached: {}", e.getClass().getSimpleName());
            throw ApiException.serviceUnavailable(SEND_FAILED_MESSAGE);
        }
    }

    // The email in the user's language (English until they pick one)
    private enum Text {
        EN("Verify your email for Aurello", "Hi",
                "Confirm your email address to start using Aurello. The link works for 24 hours.",
                "Verify email",
                "If you didn't create an account, you can ignore this email."),
        SV("Verifiera din e-post för Aurello", "Hej",
                "Bekräfta din e-postadress för att börja använda Aurello. Länken fungerar i 24 timmar.",
                "Verifiera e-post",
                "Om du inte har skapat något konto kan du strunta i det här mejlet.");

        final String subject;
        final String greeting;
        final String body;
        final String button;
        final String footer;

        Text(String subject, String greeting, String body, String button, String footer) {
            this.subject = subject;
            this.greeting = greeting;
            this.body = body;
            this.button = button;
            this.footer = footer;
        }
    }
}
