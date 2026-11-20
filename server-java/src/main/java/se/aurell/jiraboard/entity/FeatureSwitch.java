package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One feature switch (V12__feature_switches.sql); see {@link Feature}. */
@Entity
@Table(name = "feature_switches")
public class FeatureSwitch {

    @Id
    @Column(name = "feature_key")
    private String key;

    @Column(nullable = false)
    private boolean disabled;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // The site admin who changed it last; null after that user is deleted
    @Column(name = "updated_by")
    private UUID updatedBy;

    protected FeatureSwitch() {
    }

    public FeatureSwitch(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public void change(boolean disabled, UUID adminId, Instant now) {
        this.disabled = disabled;
        this.updatedBy = adminId;
        this.updatedAt = now;
    }
}
