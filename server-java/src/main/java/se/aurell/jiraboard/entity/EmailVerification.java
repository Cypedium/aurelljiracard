package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A verification link sent by email (V15__email_verification.sql). Only the token's SHA-256 hex is stored. */
@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    @Id
    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // The address this link confirms
    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    protected EmailVerification() {
    }

    public EmailVerification(String tokenHash, UUID userId, String email, Instant createdAt, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.email = email;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
