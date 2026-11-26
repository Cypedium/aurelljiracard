package se.aurell.jiraboard.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.dto.AdminUserResponse;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    // "Mike" and "mike" are the same user (names are still stored as typed)
    boolean existsByUsernameIgnoreCase(String username);

    Optional<User> findFirstByUsernameIgnoreCase(String username);

    Optional<User> findByGoogleSub(String googleSub);

    // Login with the email address: every account with it (at most one verified, V15's unique index)
    List<User> findByEmailIgnoreCase(String email);

    // A verified address belongs to one account, in any casing
    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email) and u.emailVerifiedAt is not null")
    boolean existsVerifiedEmail(String email);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email) and u.emailVerifiedAt is not null "
            + "and u.id <> :userId")
    boolean existsVerifiedEmailOfOther(String email, UUID userId);

    @Query("select new se.aurell.jiraboard.dto.UserResponse(u.id, u.username, u.role) from User u")
    List<UserResponse> findAllPublic();

    @Query("select new se.aurell.jiraboard.dto.AdminUserResponse("
            + "u.id, u.username, u.role, u.lastActiveAt, u.loggedOutAt) from User u")
    List<AdminUserResponse> findAllWithPresence();

    @Query("select u.username from User u")
    List<String> findAllUsernames();

    // Logout: atomic increment, like $inc in MongoDB, and the user shows as offline
    @Modifying(clearAutomatically = true)
    @Query("update User u set u.tokenVersion = u.tokenVersion + 1, u.loggedOutAt = :now where u.id = :id")
    int revokeTokens(UUID id, Instant now);

    // Login and token refresh
    @Modifying(clearAutomatically = true)
    @Query("update User u set u.lastActiveAt = :now where u.id = :id")
    int markActive(UUID id, Instant now);
}
