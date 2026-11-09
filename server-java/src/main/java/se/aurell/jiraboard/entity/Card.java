package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // 1-5; "Priority" in the form, estimate pill on the board
    @Column(nullable = false)
    private int rating;

    // "Summary"
    @Column(nullable = false, length = 2000)
    private String comment;

    // "Issue key", unique across all cards
    @Column(name = "product_id", nullable = false, unique = true, length = 200)
    private String productId;

    // Author, always taken from the access token
    @Column(nullable = false, length = 32)
    private String username;

    // Who works on the card; null in the backlog
    @Column(length = 32)
    private String assignee;

    // Set on create, never changed
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    // Key of a BoardColumn or "backlog"; checked by ColumnService.requireCardStatus
    @Column(nullable = false, length = 32)
    private String status = CardStatus.DEFAULT;

    // Key of an IssueType; checked by IssueTypeService.requireCardType
    @Column(nullable = false, length = 32)
    private String type = CardType.DEFAULT;

    protected Card() {
    }

    public Card(int rating, String comment, String productId, String username, Instant submittedAt) {
        this.rating = rating;
        this.comment = comment;
        this.productId = productId;
        this.username = username;
        this.submittedAt = submittedAt;
    }

    public UUID getId() {
        return id;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getUsername() {
        return username;
    }

    public String getAssignee() {
        return assignee;
    }

    public void setAssignee(String assignee) {
        this.assignee = assignee;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
