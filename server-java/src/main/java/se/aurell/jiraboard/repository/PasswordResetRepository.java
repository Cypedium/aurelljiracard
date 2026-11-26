package se.aurell.jiraboard.repository;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.entity.PasswordReset;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, String> {

    /** Throttles sending: a link sent after {@code since} means no new email yet. */
    boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant since);

    /** A new link or a finished reset makes every earlier link useless. */
    @Modifying
    @Query("delete from PasswordReset r where r.userId = :userId")
    int deleteByUser(UUID userId);
}
