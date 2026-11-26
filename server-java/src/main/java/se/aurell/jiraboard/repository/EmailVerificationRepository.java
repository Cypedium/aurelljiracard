package se.aurell.jiraboard.repository;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.entity.EmailVerification;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, String> {

    /** Throttles sending: a link sent after {@code since} means "wait a moment". */
    boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant since);

    /** A verified email (or a new link) makes every earlier link useless. */
    @Modifying
    @Query("delete from EmailVerification v where v.userId = :userId")
    int deleteByUser(UUID userId);
}
