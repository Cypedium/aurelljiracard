package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Public user info; also used as a JPQL projection so the layout column is never loaded. */
public record UserResponse(@JsonProperty("_id") UUID id, String username, String pictureUrl) {
}
