package se.aurell.jiraboard.entity;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

/** User role. Must match server/utils/role.js and frontend/app/utils/session.ts. */
public enum Role {
    USER("user"),
    // May delete any card
    ADMIN("admin");

    public static final Role DEFAULT = USER;

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /** Unknown or missing values (e.g. tokens issued before roles existed) read as {@link #DEFAULT}. */
    public static Role fromValue(String value) {
        return Arrays.stream(values()).filter(r -> r.value.equals(value)).findFirst().orElse(DEFAULT);
    }
}
