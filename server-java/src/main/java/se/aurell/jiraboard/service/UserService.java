package se.aurell.jiraboard.service;

import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.entity.Layout;
import se.aurell.jiraboard.entity.User;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.AuthUser;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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

    private static Layout.Header toHeader(LayoutRequest.HeaderRequest h) {
        String color = h.color() == null ? null : h.color().toLowerCase(Locale.ROOT);
        return new Layout.Header(h.key(), h.title().trim(), color);
    }

    private User findUser(AuthUser authUser) {
        return userRepository.findById(authUser.id()).orElseThrow(() -> ApiException.notFound("User not found."));
    }
}
