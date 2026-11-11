package se.aurell.jiraboard.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.dto.UserUpdateRequest;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.Layout;
import se.aurell.jiraboard.entity.Role;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.BoardRepository;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.security.GoogleTokenVerifier;
import se.aurell.jiraboard.security.GoogleTokenVerifier.GoogleIdentity;

@Service
public class UserService {

    private static final String CARD_POSITION_MESSAGE = "Each saved card position needs a valid list key as status.";

    static final String GOOGLE_USED_MESSAGE = "This Google account is already connected to another user.";
    static final String OTHER_GOOGLE_MESSAGE = "Your account is already connected to another Google account.";

    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final BoardRepository boardRepository;
    private final GoogleTokenVerifier googleTokenVerifier;

    public UserService(UserRepository userRepository, CardRepository cardRepository, BoardRepository boardRepository,
            GoogleTokenVerifier googleTokenVerifier) {
        this.userRepository = userRepository;
        this.cardRepository = cardRepository;
        this.boardRepository = boardRepository;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    /** Admins also see when each user was last active and who is online. */
    @Transactional(readOnly = true)
    public List<?> getAll(AuthUser authUser) {
        return authUser.isAdmin() ? userRepository.findAllWithPresence() : userRepository.findAllPublic();
    }

    @Transactional(readOnly = true)
    public List<String> getUsernames() {
        return userRepository.findAllUsernames();
    }

    @Transactional(readOnly = true)
    public Layout getLayout(AuthUser authUser) {
        return findUser(authUser).getLayout();
    }

    /** Fields left out of the request keep their saved value. */
    @Transactional
    public void updateLayout(AuthUser authUser, LayoutRequest request) {
        // A saved card position may name its list (status), so it survives lists being moved
        if (request.cards() != null && !request.cards().stream().allMatch(UserService::isValidCardPosition)) {
            throw ApiException.badRequest(CARD_POSITION_MESSAGE);
        }
        User user = findUser(authUser);
        Layout saved = user.getLayout();

        List<Layout.Header> headers = request.headers() == null
                ? saved.headers()
                : request.headers().stream().map(UserService::toHeader).toList();

        user.setLayout(new Layout(
                request.cols() != null ? request.cols() : saved.cols(),
                headers,
                request.cards() != null ? request.cards() : saved.cards()));
    }

    /**
     * Admin: rename and/or change role. Either change revokes the user's refresh tokens (their tokens
     * carry the old name and role); cards follow a rename through ON UPDATE CASCADE (V5 migration).
     */
    @Transactional
    public UserResponse update(UUID id, UserUpdateRequest request, AuthUser admin) {
        Role role = request.role() == null ? null : Role.parse(request.role())
                .orElseThrow(() -> ApiException.badRequest("Role must be one of: " + Role.ALLOWED + "."));
        // Keeps at least one admin: the caller is always an admin
        if (id.equals(admin.id()) && role != null && role != Role.ADMIN) {
            throw ApiException.badRequest("You cannot remove your own admin role.");
        }

        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        boolean renamed = request.username() != null && !request.username().equals(user.getUsername());
        boolean roleChanged = role != null && role != user.getRole();

        if (renamed && CredentialRules.isRudeUsername(request.username())) {
            throw ApiException.badRequest(CredentialRules.RUDE_USERNAME_MESSAGE);
        }
        // Only changing the casing of the user's own name ("mike" → "Mike") is not a conflict
        if (renamed && !request.username().equalsIgnoreCase(user.getUsername())
                && userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
        }
        if (renamed) {
            user.setUsername(request.username());
        }
        if (roleChanged) {
            user.setRole(role);
        }
        if (renamed || roleChanged) {
            user.revokeTokens();
            try {
                userRepository.saveAndFlush(user);
            } catch (DataIntegrityViolationException e) {
                // Another request took the name in between
                throw ApiException.conflict(CredentialRules.USERNAME_TAKEN_MESSAGE);
            }
        }
        return UserResponse.from(user);
    }

    /**
     * Admin: delete a user without cards, whose own board has no cards either. Cards assigned to them become
     * unassigned (ON DELETE SET NULL); their board, its lists and issue types and their memberships go too (V11).
     */
    @Transactional
    public void delete(UUID id, AuthUser admin) {
        if (id.equals(admin.id())) {
            throw ApiException.badRequest("You cannot delete yourself.");
        }
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        if (cardRepository.existsByUsername(user.getUsername())) {
            throw ApiException.conflict("This user still has cards. Delete them first.");
        }
        boolean boardHasCards = boardRepository.findByOwnerId(id)
                .map(board -> cardRepository.existsByBoardId(board.getId()))
                .orElse(false);
        if (boardHasCards) {
            throw ApiException.conflict("This user's board still has cards. Delete them first.");
        }
        userRepository.delete(user);
    }

    /** Admin: revoke all refresh tokens; the user must log in again within 15 minutes and shows as offline. */
    @Transactional
    public void revokeSessions(UUID id) {
        if (userRepository.revokeTokens(id, Instant.now()) == 0) {
            throw ApiException.notFound("User not found.");
        }
    }

    /**
     * Connects a Google account to the logged-in user, so "Sign in with Google" logs in as them.
     * Connecting the same Google account again does nothing.
     */
    @Transactional
    public void connectGoogle(AuthUser authUser, String credential) {
        GoogleIdentity google = googleTokenVerifier.verify(credential);
        User user = findUser(authUser);
        boolean usedByOther = userRepository.findByGoogleSub(google.subject())
                .filter(owner -> !owner.getId().equals(user.getId()))
                .isPresent();
        if (usedByOther) {
            throw ApiException.conflict(GOOGLE_USED_MESSAGE);
        }
        if (user.getGoogleSub() != null && !user.getGoogleSub().equals(google.subject())) {
            throw ApiException.conflict(OTHER_GOOGLE_MESSAGE);
        }
        user.connectGoogle(google.subject(), google.email());
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Another user connected the same Google account in between
            throw ApiException.conflict(GOOGLE_USED_MESSAGE);
        }
    }

    private static boolean isValidCardPosition(Layout.CardPosition c) {
        return c != null && (c.status() == null || CardStatus.isColumnKey(c.status()));
    }

    private static Layout.Header toHeader(LayoutRequest.HeaderRequest h) {
        String color = h.color() == null ? null : h.color().toLowerCase(Locale.ROOT);
        return new Layout.Header(h.key(), h.title().trim(), color);
    }

    private User findUser(AuthUser authUser) {
        return userRepository.findById(authUser.id()).orElseThrow(() -> ApiException.notFound("User not found."));
    }
}
