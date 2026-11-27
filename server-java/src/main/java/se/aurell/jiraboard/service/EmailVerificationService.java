package se.aurell.jiraboard.service;

import java.time.Duration;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.entity.EmailVerification;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.EmailVerificationRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.SecureTokens;

/**
 * Verification links: a random token is emailed, only its SHA-256 is stored (V15). Opening the link
 * (POST /auth/verify-email) marks the address verified, which login and token refresh require.
 */
@Service
public class EmailVerificationService {

    static final Duration LINK_TTL = Duration.ofHours(24);
    // At most one email per user per minute, so the endpoints can't be used to flood an inbox
    static final Duration RESEND_INTERVAL = Duration.ofMinutes(1);

    static final String INVALID_LINK_MESSAGE = "This verification link is invalid or has expired.";
    static final String EMAIL_TAKEN_MESSAGE = "Email already registered.";
    static final String WAIT_MESSAGE = "An email was just sent. Please wait a minute before asking for another.";

    private final EmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;

    public EmailVerificationService(EmailVerificationRepository verificationRepository, UserRepository userRepository,
            EmailSender emailSender) {
        this.verificationRepository = verificationRepository;
        this.userRepository = userRepository;
        this.emailSender = emailSender;
    }

    /**
     * Emails a new link to the user's (unverified) address; earlier links stop working. Runs in the caller's
     * transaction: if sending fails, nothing is saved. 429 if a link was sent less than a minute ago.
     */
    @Transactional
    public void sendLink(User user) {
        Instant now = Instant.now();
        if (verificationRepository.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(RESEND_INTERVAL))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, WAIT_MESSAGE);
        }
        verificationRepository.deleteByUser(user.getId());
        String token = SecureTokens.generate();
        verificationRepository.save(
                new EmailVerification(SecureTokens.sha256Hex(token), user.getId(), user.getEmail(), now, now.plus(LINK_TTL)));
        Language language = user.getLanguage() == null ? Language.EN : user.getLanguage();
        emailSender.sendVerification(user.getEmail(), user.getUsername(), emailSender.verificationLink(token), language);
    }

    /**
     * Marks the address in the link verified. 400 for an unknown, used or expired link, or one for an address
     * the user has replaced since; 409 if another account verified the same address first.
     */
    @Transactional
    public void verify(String token) {
        Instant now = Instant.now();
        // Expired rows stay until the user's next link replaces them (sendLink) or the user is deleted
        EmailVerification link = verificationRepository.findById(SecureTokens.sha256Hex(token))
                .filter(l -> !l.isExpired(now))
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK_MESSAGE));
        User user = userRepository.findById(link.getUserId())
                .filter(u -> link.getEmail().equalsIgnoreCase(u.getEmail()))
                .orElseThrow(() -> ApiException.badRequest(INVALID_LINK_MESSAGE));
        if (userRepository.existsVerifiedEmailOfOther(user.getEmail(), user.getId())) {
            throw ApiException.conflict(EMAIL_TAKEN_MESSAGE);
        }
        user.verifyEmail(user.getEmail(), now);
        verificationRepository.deleteByUser(user.getId());
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Another account verified the same address in between (V15's unique index)
            throw ApiException.conflict(EMAIL_TAKEN_MESSAGE);
        }
    }
}
