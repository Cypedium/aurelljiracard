package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A user's board (V11__boards.sql). Collaborators join through an invite link; see {@link BoardMember}. */
@Entity
@Table(name = "boards")
public class Board {

    @Id
    private UUID id;

    // One board per user
    @Column(name = "owner_id", nullable = false, unique = true, updatable = false)
    private UUID ownerId;

    // SHA-256 (hex) of the invite token; null = no link
    @Column(name = "invite_token_hash", unique = true, length = 64)
    private String inviteTokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Board() {
    }

    public Board(UUID ownerId) {
        this.id = UUID.randomUUID();
        this.ownerId = ownerId;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getInviteTokenHash() {
        return inviteTokenHash;
    }

    public void setInviteTokenHash(String inviteTokenHash) {
        this.inviteTokenHash = inviteTokenHash;
    }

    /** The name shown in the board switcher; follows a rename of the owner. */
    public static String nameFor(String ownerUsername) {
        return ownerUsername + "'s board";
    }
}
