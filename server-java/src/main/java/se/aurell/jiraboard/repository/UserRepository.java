package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.dto.UserResponse;
import se.aurell.jiraboard.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("select new se.aurell.jiraboard.dto.UserResponse(u.id, u.username, u.pictureUrl) from User u")
    List<UserResponse> findAllPublic();

    @Query("select u.username from User u")
    List<String> findAllUsernames();

    // Atomic increment, like $inc in MongoDB
    @Modifying(clearAutomatically = true)
    @Query("update User u set u.tokenVersion = u.tokenVersion + 1 where u.id = :id")
    int incrementTokenVersion(UUID id);
}
