package se.aurell.jiraboard.dto;

import java.time.Instant;

/**
 * One switch for the admin's Features page. For "readOnly", {@code enabled} means read-only mode is on;
 * for every other key it means the feature is on. {@code updatedBy} is a username (null if never changed
 * or the admin was deleted).
 */
public record FeatureSwitchResponse(String key, boolean enabled, boolean uiOnly, Instant updatedAt, String updatedBy) {
}
