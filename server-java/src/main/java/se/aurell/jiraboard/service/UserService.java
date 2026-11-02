package se.aurell.jiraboard.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.dto.UserUpdateRequest;
import se.aurell.jiraboard.entity.Layout;
import se.aurell.jiraboard.entity.Role;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.AuthUser;

@Service
public class UserService {

    private static final String USERNAME_TAKEN_MESSAGE = "Username already taken.";

    private final UserRepository userRepository;
    private final CardRepository cardRepository;

    public UserService(UserRepository userRepository, CardRepository cardRepository) {
        this.userRepository = userRepository;
        this.cardRepository = cardRepository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepository.findAllPublic();
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
        requireAdmin(admin);
        Role role = request.role() == null ? null : Role.parse(request.role())
                .orElseThrow(() -> ApiException.badRequest("Role must be one of: " + Role.ALLOWED + "."));
        // Keeps at least one admin: the caller is always an admin
        if (id.equals(admin.id()) && role != null && role != Role.ADMIN) {
            throw ApiException.badRequest("You cannot remove your own admin role.");
        }

        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        boolean renamed = request.username() != null && !request.username().equals(user.getUsername());
        boolean roleChanged = role != null && role != user.getRole();

        if (renamed && userRepository.existsByUsername(request.username())) {
            throw ApiException.conflict(USERNAME_TAKEN_MESSAGE);
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
                throw ApiException.conflict(USERNAME_TAKEN_MESSAGE);
            }
        }
        return UserResponse.from(user);
    }

    /** Admin: delete a user without cards; cards assigned to them become unassigned (ON DELETE SET NULL). */
    @Transactional
    public void delete(UUID id, AuthUser admin) {
        requireAdmin(admin);
        if (id.equals(admin.id())) {
            throw ApiException.badRequest("You cannot delete yourself.");
        }
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found."));
        if (cardRepository.existsByUsername(user.getUsername())) {
            throw ApiException.conflict("This user still has cards. Delete them first.");
        }
        userRepository.delete(user);
    }

    /** Admin: revoke all refresh tokens; the user must log in again within 15 minutes. */
    @Transactional
    public void revokeSessions(UUID id, AuthUser admin) {
        requireAdmin(admin);
        if (userRepository.incrementTokenVersion(id) == 0) {
            throw ApiException.notFound("User not found.");
        }
    }

    private static void requireAdmin(AuthUser user) {
        if (!user.isAdmin()) {
            throw ApiException.forbidden("Admins only.");
        }
    }

    private static Layout.Header toHeader(LayoutRequest.HeaderRequest h) {
        String color = h.color() == null ? null : h.color().toLowerCase(Locale.ROOT);
        return new Layout.Header(h.key(), h.title().trim(), color);
    }

    private User findUser(AuthUser authUser) {
        return userRepository.findById(authUser.id()).orElseThrow(() -> ApiException.notFound("User not found."));
    }
}
