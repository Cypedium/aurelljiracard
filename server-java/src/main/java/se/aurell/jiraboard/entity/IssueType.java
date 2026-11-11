package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;

/** An issue type on one board. Cards on the board point at it with type = key. */
@Entity
@Table(name = "issue_types")
@IdClass(IssueType.Key.class)
public class IssueType {

    public record Key(UUID boardId, String typeKey) implements Serializable {
        public Key() {
            this(null, null);
        }
    }

    @Id
    @Column(name = "board_id")
    private UUID boardId;

    @Id
    @Column(name = "type_key", length = 32)
    private String typeKey;

    @Column(nullable = false, length = 30)
    private String label;

    // Icon background, #rrggbb lowercase
    @Column(nullable = false, length = 7)
    private String color;

    // One of CardType.ICONS
    @Column(nullable = false, length = 20)
    private String icon;

    // Order in the issue type dropdown
    @Column(nullable = false)
    private int position;

    protected IssueType() {
    }

    public IssueType(UUID boardId, String typeKey, String label, String color, String icon, int position) {
        this.boardId = boardId;
        this.typeKey = typeKey;
        this.label = label;
        this.color = color;
        this.icon = icon;
        this.position = position;
    }

    public UUID getBoardId() {
        return boardId;
    }

    public String getTypeKey() {
        return typeKey;
    }

    public String getLabel() {
        return label;
    }

    public String getColor() {
        return color;
    }

    public String getIcon() {
        return icon;
    }

    public int getPosition() {
        return position;
    }
}
