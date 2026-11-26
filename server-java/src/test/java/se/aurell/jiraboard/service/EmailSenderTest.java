package se.aurell.jiraboard.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import se.aurell.jiraboard.config.MailProperties;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.exception.ApiException;

/** The parts that don't call Resend; the API tests mock the sender. */
class EmailSenderTest {

    @Test
    void linkPointsToTheFrontendsVerifyPage() {
        EmailSender sender = new EmailSender(new MailProperties("key", "Aurello <a@example.com>", "https://app.example/"));

        assertThat(sender.verificationLink("abc")).isEqualTo("https://app.example/verify-email/abc");
    }

    @Test
    void withoutAnApiKeyNothingIsSent() {
        EmailSender sender = new EmailSender(new MailProperties("", "Aurello <a@example.com>", "https://app.example"));

        assertThatThrownBy(() -> sender.sendVerification("a@example.com", "alice", "https://x", Language.EN))
                .isInstanceOf(ApiException.class)
                .hasMessage(EmailSender.NOT_CONFIGURED_MESSAGE)
                .extracting(e -> ((ApiException) e).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
