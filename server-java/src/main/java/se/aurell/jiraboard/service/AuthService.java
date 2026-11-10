package se.aurell.jiraboard.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import se.aurell.jiraboard.dto.LoginRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.TokenResponse;
import se.aurell.jiraboard.entity.RefreshToken;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.RefreshTokenRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.JwtService;

@Service
public class AuthService {

    // bcrypt ignores bytes beyond 72, so multi-byte passwords are checked by byte length too
    private static final int PASSWORD_MAX_BYTES = 72;
    private static final int PICTURE_MAX_LENGTH = 1536 * 1024; // base64 data URL, ~1 MB image
    private static final Pattern PICTURE_URL_PREFIX =
            Pattern.compile("^(data:image/[a-z+.-]+;base64,|https?://)", Pattern.CASE_INSENSITIVE);

    private static final String INVALID_REFRESH_MESSAGE = "Invalid refresh token";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > PASSWORD_MAX_BYTES) {
            throw ApiException.badRequest(CredentialRules.PASSWORD_LENGTH_MESSAGE);
        }
        if (CredentialRules.isRudeUsername(request.username())) {
            throw ApiException.badRequest(CredentialRules.RUDE_USERNAME_MESSAGE);
        }
        if (CredentialRules.isRepetitivePassword(request.password())) {
            throw ApiException.badRequest(CredentialRules.PASSWORD_REPEAT_MESSAGE);
        }
        String pictureUrl = StringUtils.hasText(request.pictureUrl()) ? request.pictureUrl() : null;
        if (pictureUrl != null && !isValidPicture(pictureUrl)) {
            throw ApiException.badRequest("Invalid profile picture.");
        }
        // "mike" is taken if "Mike" exists
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
        }

        try {
            userRepository.saveAndFlush(
                    new User(request.username(), passwordEncoder.encode(request.password()), pictureUrl));
        } catch (DataIntegrityViolationException e) {
            // Another request registered the same username in between
            throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
        }
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        // Exact name first; otherwise any casing ("mike" logs in as "Mike")
        User user = userRepository.findByUsername(request.username())
                .or(() -> userRepository.findFirstByUsernameIgnoreCase(request.username()))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid credentials."));
        // Every login starts a new token family
        return issueTokens(user, UUID.randomUUID());
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

    private static boolean isValidPicture(String pictureUrl) {
        return pictureUrl.length() <= PICTURE_MAX_LENGTH && PICTURE_URL_PREFIX.matcher(pictureUrl).lookingAt();
    }
}
