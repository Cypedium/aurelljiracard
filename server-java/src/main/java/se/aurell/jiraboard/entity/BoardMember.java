package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * A user's role on a board: the owner is {@link Role#ADMIN} (lists, issue types, any card),
 * collaborators are {@link Role#USER}. Unrelated to the global {@link User} role.
 */
@Entity
@Table(name = "board_members")
@IdClass(BoardMember.Key.class)
public class BoardMember {

    public record Key(UUID boardId, UUID userId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }

    @Id
    @Column(name = "board_id")
    private UUID boardId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Convert(converter = EnumConverters.RoleConverter.class)
    @Column(nullable = false, length = 10)
    private Role role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    protected BoardMember() {
    }

    public BoardMember(UUID boardId, UUID userId, Role role) {
        this.boardId = boardId;
        this.userId = userId;
        this.role = role;
        this.joinedAt = Instant.now();
    }

    public UUID getBoardId() {
        return boardId;
    }

    public UUID getUserId() {
        return userId;
    }

    public Role getRole() {
        return role;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
