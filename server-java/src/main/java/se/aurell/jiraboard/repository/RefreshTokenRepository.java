package se.aurell.jiraboard.repository;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.entity.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /** Row lock, so two refreshes with the same token run one after the other and the second sees it used. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RefreshToken t where t.id = :id")
    Optional<RefreshToken> findForUpdate(UUID id);

    /** Revokes one login: every token issued since it, including the current one. */
    @Modifying
    @Query("delete from RefreshToken t where t.familyId = :familyId")
    int deleteFamily(UUID familyId);

    /** For refresh tokens issued before V9 (no jti): concurrent first uses insert one row, not a conflict. */
    @Modifying
    @Query(value = """
            INSERT INTO refresh_tokens (id, family_id, user_id, expires_at)
            VALUES (:id, :familyId, :userId, :expiresAt)
            ON CONFLICT (id) DO NOTHING""", nativeQuery = true)
    int insertIfAbsent(UUID id, UUID familyId, UUID userId, Instant expiresAt);

    @Modifying
    @Query("delete from RefreshToken t where t.userId = :userId and t.expiresAt < :now")
    int deleteExpired(UUID userId, Instant now);
}
