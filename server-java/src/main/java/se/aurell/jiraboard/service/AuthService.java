package se.aurell.jiraboard.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.LanguageRequest;
import se.aurell.jiraboard.dto.LoginRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.TokenResponse;
import se.aurell.jiraboard.dto.VerificationEmailRequest;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.RefreshToken;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.RefreshTokenRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.GoogleTokenVerifier;
import se.aurell.jiraboard.security.GoogleTokenVerifier.GoogleIdentity;
import se.aurell.jiraboard.security.JwtService;

@Service
public class AuthService {

    private static final String INVALID_REFRESH_MESSAGE = "Invalid refresh token";

    // Same limit as RegisterRequest
    private static final int USERNAME_MAX_LENGTH = 32;
    private static final String GOOGLE_FALLBACK_USERNAME = "user";
    static final String GOOGLE_RETRY_MESSAGE = "Could not create the account. Please try again.";
    static final String GOOGLE_EMAIL_TAKEN_MESSAGE =
            "An account with this email already exists. Log in with your password and connect Google from the account menu.";
    // The frontend recognises these two and offers to send the verification link
    static final String EMAIL_MISSING_MESSAGE = "Please add your email address.";
    static final String EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email address.";
    static final String ALREADY_VERIFIED_MESSAGE = "Your email is already verified.";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final BoardService boardService;
    private final FeatureService featureService;
    private final EmailVerificationService emailVerificationService;
    private final LoginAttempts loginAttempts;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, GoogleTokenVerifier googleTokenVerifier,
            BoardService boardService, FeatureService featureService, EmailVerificationService emailVerificationService,
            LoginAttempts loginAttempts) {
        this.loginAttempts = loginAttempts;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.boardService = boardService;
        this.featureService = featureService;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (CredentialRules.isRudeUsername(request.username())) {
            throw ApiException.badRequest(CredentialRules.RUDE_USERNAME_MESSAGE);
        }
        CredentialRules.requireValidNewPassword(request.password());
        Language language = request.language() == null ? null : Language.parse(request.language())
                .orElseThrow(() -> ApiException.badRequest(LanguageRequest.MESSAGE));
        // "mike" is taken if "Mike" exists
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
        }
        // Only verified addresses are taken: an unverified one may be a typo or someone else's
        if (userRepository.existsVerifiedEmail(request.email())) {
            throw ApiException.conflict(EmailVerificationService.EMAIL_TAKEN_MESSAGE);
        }

        User user = new User(request.username(), passwordEncoder.encode(request.password()));
        user.setUnverifiedEmail(request.email());
        user.setLanguage(language);
        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Another request registered the same username in between
            throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
        }
        boardService.createFor(user.getId());
        // If the email can't be sent, the whole registration is rolled back (503) and can simply be repeated
        emailVerificationService.sendLink(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = findByCredentials(request.username(), request.password());
        requireVerifiedEmail(user);
        // Every login starts a new token family
        return issueTokens(user, UUID.randomUUID());
    }

    /**
     * Emails a (new) verification link to a user who can't log in yet because the email isn't verified.
     * Needs the password, so nobody else can trigger emails or change the address. email: replaces the
     * address (a typo at registration), required for older accounts that have none.
     */
    @Transactional
    public void sendVerificationEmail(VerificationEmailRequest request) {
        User user = findByCredentials(request.username(), request.password());
        if (user.isEmailVerified()) {
            throw ApiException.conflict(ALREADY_VERIFIED_MESSAGE);
        }
        String email = request.email();
        if (email != null && !email.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsVerifiedEmail(email)) {
                throw ApiException.conflict(EmailVerificationService.EMAIL_TAKEN_MESSAGE);
            }
            user.setUnverifiedEmail(email);
        }
        if (user.getEmail() == null) {
            throw ApiException.badRequest(RegisterRequest.EMAIL_MESSAGE);
        }
        emailVerificationService.sendLink(user);
    }

    /**
     * Username in any casing ("mike" logs in as "Mike"), or the email address. 401 for a wrong name or
     * password, and for users created by Google sign-in (no password). 429 after too many failures for the
     * name (LoginAttempts), checked before the password so guessing stops even from many IPs.
     */
    private User findByCredentials(String usernameOrEmail, String password) {
        loginAttempts.requireAllowed(usernameOrEmail);
        Optional<User> user = matchCredentials(usernameOrEmail, password);
        if (user.isEmpty()) {
            loginAttempts.recordFailure(usernameOrEmail);
            throw invalidCredentials();
        }
        loginAttempts.recordSuccess(usernameOrEmail);
        return user.get();
    }

    private Optional<User> matchCredentials(String usernameOrEmail, String password) {
        Predicate<User> passwordMatches = u -> u.getPasswordHash() != null
                && passwordEncoder.matches(password, u.getPasswordHash());
        Optional<User> byName = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findFirstByUsernameIgnoreCase(usernameOrEmail));
        if (byName.isPresent() || usernameOrEmail.indexOf('@') < 0) {
            return byName.filter(passwordMatches);
        }
        // An unverified address may be on several accounts: the verified one first, then the one with this password
        return userRepository.findByEmailIgnoreCase(usernameOrEmail).stream()
                .sorted(Comparator.comparing(User::isEmailVerified).reversed())
                .filter(passwordMatches)
                .findFirst();
    }

    private static ApiException invalidCredentials() {
        return ApiException.unauthorized("Invalid credentials.");
    }

    /** Login and token refresh: 403 until the email is verified (the frontend offers to send the link). */
    private static void requireVerifiedEmail(User user) {
        if (user.getEmail() == null) {
            throw ApiException.forbidden(EMAIL_MISSING_MESSAGE);
        }
        if (!user.isEmailVerified()) {
            throw ApiException.forbidden(EMAIL_NOT_VERIFIED_MESSAGE);
        }
    }

    /**
     * Sign in with Google. The Google account (its "sub") finds the user: one created by an earlier
     * Google sign-in, or a password user who connected Google (UserService.connectGoogle). Otherwise
     * a new user is created, named after the email address ("mikael.aurell@gmail.com" → "mikael.aurell").
     */
    @Transactional
    public TokenResponse googleLogin(String credential) {
        GoogleIdentity google = googleTokenVerifier.verify(credential);
        User user = userRepository.findByGoogleSub(google.subject()).orElseGet(() -> createGoogleUser(google));
        // Google checked its address: it verifies an account that has none verified yet, unless another account has it
        if (!user.isEmailVerified() && !userRepository.existsVerifiedEmailOfOther(google.email(), user.getId())) {
            user.verifyEmail(google.email(), Instant.now());
            // issueTokens (markActive) clears the persistence context, so write it first
            user = userRepository.saveAndFlush(user);
        }
        requireVerifiedEmail(user);
        return issueTokens(user, UUID.randomUUID());
    }

    private User createGoogleUser(GoogleIdentity google) {
        // Registration off or read-only mode: no new users (existing ones still sign in)
        featureService.requireUserCreationAllowed();
        // No automatic merge: the owner of that account can connect Google from the account menu
        if (userRepository.existsVerifiedEmail(google.email())) {
            throw ApiException.conflict(GOOGLE_EMAIL_TAKEN_MESSAGE);
        }
        String base = googleUsernameBase(google.email());
        String username = base;
        // "mikael.aurell" taken → "mikael.aurell2", "mikael.aurell3" …, still at most 32 characters
        for (int n = 2; userRepository.existsByUsernameIgnoreCase(username); n++) {
            String suffix = Integer.toString(n);
            username = base.substring(0, Math.min(base.length(), USERNAME_MAX_LENGTH - suffix.length())) + suffix;
        }
        User user;
        try {
            user = userRepository.saveAndFlush(User.fromGoogle(username, google.subject(), google.email(), Instant.now()));
        } catch (DataIntegrityViolationException e) {
            // Another request took the name, or signed in with the same Google account, in between
            throw ApiException.conflict(GOOGLE_RETRY_MESSAGE);
        }
        boardService.createFor(user.getId());
        return user;
    }

    /** The part of the email before "@", cut to the username length; "user" if empty or rude. */
    static String googleUsernameBase(String email) {
        String local = email.substring(0, Math.max(0, email.indexOf('@'))).strip();
        if (local.length() > USERNAME_MAX_LENGTH) {
            local = local.substring(0, USERNAME_MAX_LENGTH);
        }
        return local.isEmpty() || CredentialRules.isRudeUsername(local) ? GOOGLE_FALLBACK_USERNAME : local;
    }

    /** Revokes every refresh token issued to the user by bumping tokenVersion. */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null) {
            return;
        }
        try {
            userRepository.revokeTokens(jwtService.decodeRefreshToken(refreshToken).userId(), Instant.now());
        } catch (JwtException e) {
            // Invalid or expired token: nothing to revoke
        }
    }

    /**
     * Trades a refresh token for a new pair. Each refresh token works once: one that comes back
     * after being used was copied (a duplicated tab, or stolen), so that whole login (its family)
     * is revoked. Other logins of the user keep working.
     * noRollbackFor: the revocation must be saved although the request ends in 403.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public TokenResponse refresh(String refreshToken) {
        if (refreshToken == null) {
            throw ApiException.unauthorized("No refresh token provided");
        }

        JwtService.RefreshClaims claims;
        try {
            claims = jwtService.decodeRefreshToken(refreshToken);
        } catch (JwtException e) {
            throw ApiException.forbidden(INVALID_REFRESH_MESSAGE);
        }

        User user = userRepository.findById(claims.userId())
                .filter(u -> u.getTokenVersion() == claims.tokenVersion())
                .orElseThrow(() -> ApiException.forbidden(INVALID_REFRESH_MESSAGE));
        // Logins from before email verification end here: the user logs in again and verifies
        requireVerifiedEmail(user);

        RefreshToken current = claims.tokenId() != null
                ? refreshTokenRepository.findForUpdate(claims.tokenId())
                        .orElseThrow(() -> ApiException.forbidden(INVALID_REFRESH_MESSAGE))
                : legacyToken(refreshToken, claims);
        if (!current.getUserId().equals(user.getId())) {
            throw ApiException.forbidden(INVALID_REFRESH_MESSAGE);
        }
        if (current.isUsed()) {
            refreshTokenRepository.deleteFamily(current.getFamilyId());
            throw ApiException.forbidden(INVALID_REFRESH_MESSAGE);
        }
        current.markUsed(Instant.now());
        // markActive clears the persistence context, so write the change first
        refreshTokenRepository.flush();
        return issueTokens(user, current.getFamilyId());
    }

    /**
     * Refresh tokens issued before V9__refresh_tokens.sql have no jti. Their row id is derived
     * from the token itself, so each is accepted once and then starts a family.
     * Remove 7 days after V9 is deployed: every such token has expired by then.
     */
    private RefreshToken legacyToken(String refreshToken, JwtService.RefreshClaims claims) {
        UUID id = UUID.nameUUIDFromBytes(refreshToken.getBytes(StandardCharsets.UTF_8));
        Instant expiresAt = Objects.requireNonNullElse(claims.expiresAt(), Instant.now());
        // Second use of the same old token: the row exists (used) and this does nothing
        refreshTokenRepository.insertIfAbsent(id, UUID.randomUUID(), claims.userId(), expiresAt);
        return refreshTokenRepository.findForUpdate(id)
                .orElseThrow(() -> ApiException.forbidden(INVALID_REFRESH_MESSAGE));
    }

    /** Also marks the user active, for the admin user list, and drops the user's expired tokens. */
    private TokenResponse issueTokens(User user, UUID familyId) {
        Instant now = Instant.now();
        userRepository.markActive(user.getId(), now);
        refreshTokenRepository.deleteExpired(user.getId(), now);

        UUID tokenId = UUID.randomUUID();
        JwtService.IssuedRefreshToken refresh = jwtService.issueRefreshToken(user, tokenId);
        refreshTokenRepository.save(new RefreshToken(tokenId, familyId, user.getId(), refresh.expiresAt()));
        return new TokenResponse(jwtService.issueAccessToken(user), refresh.value());
    }
}
