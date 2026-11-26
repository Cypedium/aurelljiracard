package se.aurell.jiraboard.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.PasswordReset;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.PasswordResetRepository;
import se.aurell.jiraboard.repository.UserRepository;

/**
 * Forgot password: a random token is emailed, only its SHA-256 is stored (V16). Opening the link and choosing
 * a new password (POST /auth/reset-password) sets it and logs the user out everywhere.
 */
@Service
public class PasswordResetService {

    static final Duration LINK_TTL = Duration.ofHours(1);
    // At most one email per account per minute, so the endpoint can't be used to flood an inbox
    static final Duration RESEND_INTERVAL = Duration.ofMinutes(1);
    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    static final String INVALID_LINK_MESSAGE = "This password reset link is invalid or has expired.";

    private final PasswordResetRepository resetRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    public PasswordResetService(PasswordResetRepository resetRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder, EmailSender emailSender) {
        this.resetRepository = resetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
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
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Language language = user.getLanguage() != null ? user.getLanguage()
                : Optional.ofNullable(uiLanguage).flatMap(Language::parse).orElse(Language.EN);
        try {
            emailSender.sendPasswordReset(user.getEmail(), user.getUsername(), emailSender.passwordResetLink(token),
                    language);
        } catch (ApiException e) {
            // EmailSender has logged why; the user simply asks again. Earlier links keep working then
            return;
        }
        resetRepository.deleteByUser(user.getId());
        resetRepository.save(new PasswordReset(BoardService.hash(token), user.getId(), now, now.plus(LINK_TTL)));
    }

    /**
     * Sets the new password and revokes every refresh token of the user (all devices are logged out).
     * 400 for an unknown, used or expired link, or a password that breaks the rules (the link still works then).
     */
    @Transactional
    public void reset(String token, String password) {
        Instant now = Instant.now();
        PasswordReset link = resetRepository.findById(BoardService.hash(token))
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
