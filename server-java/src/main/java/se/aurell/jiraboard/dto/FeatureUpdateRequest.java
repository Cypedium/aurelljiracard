package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotNull;

/** PUT /feature/{key}: turn a feature on or off; for "readOnly", true turns read-only mode on. */
public record FeatureUpdateRequest(@NotNull(message = "enabled must be true or false.") Boolean enabled) {
}
