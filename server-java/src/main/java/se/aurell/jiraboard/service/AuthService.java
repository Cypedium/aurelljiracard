package se.aurell.jiraboard.service;

import java.nio.charset.StandardCharsets;
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
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.JwtService;

@Service
public class AuthService {

    // bcrypt ignores bytes beyond 72, so multi-byte passwords are checked by byte length too
    private static final int PASSWORD_MAX_BYTES = 72;
    private static final int PICTURE_MAX_LENGTH = 1536 * 1024; // base64 data URL, ~1 MB image
    private static final Pattern PICTURE_URL_PREFIX =
            Pattern.compile("^(data:image/[a-z+.-]+;base64,|https?://)", Pattern.CASE_INSENSITIVE);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > PASSWORD_MAX_BYTES) {
            throw ApiException.badRequest("Password must be 6-72 characters.");
        }
        String pictureUrl = StringUtils.hasText(request.pictureUrl()) ? request.pictureUrl() : null;
        if (pictureUrl != null && !isValidPicture(pictureUrl)) {
            throw ApiException.badRequest("Invalid profile picture.");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw ApiException.conflict("Username already taken.");
        }

        try {
            userRepository.saveAndFlush(
                    new User(request.username(), passwordEncoder.encode(request.password()), pictureUrl));
        } catch (DataIntegrityViolationException e) {
            // Another request registered the same username in between
            throw ApiException.conflict("Username already taken.");
        }
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid credentials."));
        return issueTokens(user);
    }

    /** Revokes every refresh token issued to the user by bumping tokenVersion. */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null) {
            return;
        }
        try {
            userRepository.incrementTokenVersion(jwtService.decodeRefreshToken(refreshToken).userId());
        } catch (JwtException e) {
            // Invalid or expired token: nothing to revoke
        }
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        if (refreshToken == null) {
            throw ApiException.unauthorized("No refresh token provided");
        }

        JwtService.RefreshClaims claims;
        try {
            claims = jwtService.decodeRefreshToken(refreshToken);
        } catch (JwtException e) {
            throw ApiException.forbidden("Invalid refresh token");
        }

        User user = userRepository.findById(claims.userId())
                .filter(u -> u.getTokenVersion() == claims.tokenVersion())
                .orElseThrow(() -> ApiException.forbidden("Invalid refresh token"));
        return issueTokens(user);
    }

    private TokenResponse issueTokens(User user) {
        return new TokenResponse(jwtService.issueAccessToken(user), jwtService.issueRefreshToken(user));
    }

    private static boolean isValidPicture(String pictureUrl) {
        return pictureUrl.length() <= PICTURE_MAX_LENGTH && PICTURE_URL_PREFIX.matcher(pictureUrl).lookingAt();
    }
}
