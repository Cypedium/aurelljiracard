package se.aurell.jiraboard.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.PasswordReset;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.PasswordResetRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.SecureTokens;

/**
 * Forgot password: a random token is emailed, only its SHA-256 is stored (V16). Opening the link and choosing
 * a new password (POST /auth/reset-password) sets it and logs the user out everywhere.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    static final Duration LINK_TTL = Duration.ofHours(1);
    // At most one email per account per minute, so the endpoint can't be used to flood an inbox
    static final Duration RESEND_INTERVAL = Duration.ofMinutes(1);

    static final String INVALID_LINK_MESSAGE = "This password reset link is invalid or has expired.";

    private final PasswordResetRepository resetRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final TaskExecutor sendExecutor;

    /** async: app.mail.async; the API tests send at once, so they can check the email right after the request. */
    public PasswordResetService(PasswordResetRepository resetRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder, EmailSender emailSender, @Value("${app.mail.async:true}") boolean async) {
        this.resetRepository = resetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        if (async) {
            SimpleAsyncTaskExecutor executor = new SimpleAsyncTaskExecutor("password-reset-email-");
            executor.setVirtualThreads(true);
            this.sendExecutor = executor;
        } else {
            this.sendExecutor = new SyncTaskExecutor();
        }
    }

    /**
     * Emails a reset link if a password account has verified this address. The caller can't tell whether one
     * did: no account, an unverified address, a Google-only account, a link sent less than a minute ago and a
     * failed send all end the same way, so the endpoint doesn't reveal who has an account. Only a missing mail
     * configuration answers 503, for every address.
     *
     * @param uiLanguage the language of the page ("en", "sv"), for accounts that have none saved; others are ignored
     */
    @Transactional
    public void sendLink(String email, String uiLanguage) {
        emailSender.requireConfigured();
        Optional<User> account = userRepository.findByEmailIgnoreCase(email).stream()
                .filter(u -> u.isEmailVerified() && u.getPasswordHash() != null)
                .findFirst();
        if (account.isEmpty()) {
            return;
        }
        User user = account.get();
        Instant now = Instant.now();
        if (resetRepository.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(RESEND_INTERVAL))) {
            return;
        }
        String token = SecureTokens.generate();
        Language language = user.getLanguage() != null ? user.getLanguage()
                : Optional.ofNullable(uiLanguage).flatMap(Language::parse).orElse(Language.EN);
        resetRepository.deleteByUser(user.getId());
        resetRepository.save(new PasswordReset(SecureTokens.sha256Hex(token), user.getId(), now, now.plus(LINK_TTL)));
        String to = user.getEmail();
        String username = user.getUsername();
        String link = emailSender.passwordResetLink(token);
        // After the commit (the link must work when it arrives) and in the background, so the answer doesn't take
        // longer for an address that has an account
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                sendExecutor.execute(() -> send(to, username, link, language));
            }
        });
    }

    private void send(String to, String username, String link, Language language) {
        try {
            emailSender.sendPasswordReset(to, username, link, language);
        } catch (ApiException e) {
            // EmailSender has logged why; the user asks again after a minute
        } catch (RuntimeException e) {
            log.warn("Could not send the password reset email: {}", e.getClass().getSimpleName());
        }
    }

    /**
     * Sets the new password and revokes every refresh token of the user (all devices are logged out).
     * 400 for an unknown, used or expired link, or a password that breaks the rules (the link still works then).
     */
    @Transactional
    public void reset(String token, String password) {
        Instant now = Instant.now();
        PasswordReset link = resetRepository.findById(SecureTokens.sha256Hex(token))
                .filter(l -> !l.isExpired(now))
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK_MESSAGE));
        User user = userRepository.findById(link.getUserId())
                .filter(u -> u.getPasswordHash() != null)
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK_MESSAGE));
        CredentialRules.requireValidNewPassword(password);
        user.changePassword(passwordEncoder.encode(password));
        user.revokeTokens();
        // Expired rows of other users stay until their next link or reset replaces them, or the user is deleted
        resetRepository.deleteByUser(user.getId());
    }
}
