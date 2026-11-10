package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

    // null for users created by Google sign-in
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    // Google's user id ("sub"); set by Google sign-in or by connecting Google (V10 migration)
    @Column(name = "google_sub", unique = true)
    private String googleSub;

    @Column(length = 320)
    private String email;

    @Column(name = "picture_url", nullable = false)
    private String pictureUrl = DEFAULT_PICTURE_URL;

    // "admin" may edit and delete any card and manage users
    @Convert(converter = EnumConverters.RoleConverter.class)
    @Column(nullable = false, length = 10)
    private Role role = Role.DEFAULT;

    // Incremented on logout to revoke all outstanding refresh tokens
    @Column(name = "token_version", nullable = false)
    private int tokenVersion;

    // Presence for the admin user list: set on login/refresh and on logout (UserRepository)
    @Column(name = "last_active_at")
    private Instant lastActiveAt;

    @Column(name = "logged_out_at")
    private Instant loggedOutAt;

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

    /** A user created by Google sign-in: no password. */
    public static User fromGoogle(String username, String googleSub, String email, String pictureUrl) {
        User user = new User(username, null, pictureUrl);
        user.connectGoogle(googleSub, email);
        return user;
    }

    public void connectGoogle(String googleSub, String email) {
        this.googleSub = googleSub;
        this.email = email;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public String getEmail() {
        return email;
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

    public void setUsername(String username) {
        this.username = username;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    /** Revokes every refresh token issued so far, like logout. */
    public void revokeTokens() {
        tokenVersion++;
    }

    public int getTokenVersion() {
        return tokenVersion;
    }

    public Instant getLastActiveAt() {
        return lastActiveAt;
    }

    public Instant getLoggedOutAt() {
        return loggedOutAt;
    }

    public Layout getLayout() {
        return layout;
    }

    public void setLayout(Layout layout) {
        this.layout = layout;
    }
}
