package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An issued refresh token (V9__refresh_tokens.sql). Each one may be traded for new tokens once. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    // The token's jti
    @Id
    private UUID id;

    // All tokens from one login
    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    // Set when the token is traded in; a second use means it was copied
    @Column(name = "used_at")
    private Instant usedAt;

    protected RefreshToken() {
    }

    public RefreshToken(UUID id, UUID familyId, UUID userId, Instant expiresAt) {
        this.id = id;
        this.familyId = familyId;
        this.userId = userId;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public UUID getUserId() {
        return userId;
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public void markUsed(Instant now) {
        usedAt = now;
    }
}
