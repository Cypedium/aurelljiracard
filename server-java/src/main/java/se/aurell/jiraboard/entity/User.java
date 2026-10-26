package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
public class User {

    public static final String DEFAULT_PICTURE_URL = "https://example.com/default-profile.png";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 32)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "picture_url", nullable = false)
    private String pictureUrl = DEFAULT_PICTURE_URL;

    // Incremented on logout to revoke all outstanding refresh tokens
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Layout layout = Layout.empty();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String username, String passwordHash, String pictureUrl) {
        this.username = username;
        this.passwordHash = passwordHash;
        if (pictureUrl != null) {
            this.pictureUrl = pictureUrl;
        }
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }

    public Layout getLayout() {
        return layout;
    }

    public void setLayout(Layout layout) {
        this.layout = layout;
    }
}
