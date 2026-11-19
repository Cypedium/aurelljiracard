package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * GET /feature: read-only mode and the keys of the features that are off (UI-only ones included).
 * {@code switches} (every switch with who changed it) is only sent to site admins.
 */
public record FeatureStateResponse(
        boolean readOnly,
        List<String> disabled,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<FeatureSwitchResponse> switches) {
}
