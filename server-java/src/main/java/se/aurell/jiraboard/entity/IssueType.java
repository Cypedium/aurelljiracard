package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An issue type, shared by all users. Cards point at it with type = key. */
@Entity
@Table(name = "issue_types")
public class IssueType {

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

    public IssueType(String typeKey, String label, String color, String icon, int position) {
        this.typeKey = typeKey;
        this.label = label;
        this.color = color;
        this.icon = icon;
        this.position = position;
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
