package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;
import se.aurell.jiraboard.entity.Role;
import se.aurell.jiraboard.entity.User;

/** Public user info; also used as a JPQL projection so the layout column is never loaded. */
public record UserResponse(@JsonProperty("_id") UUID id, String username, String pictureUrl, Role role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getPictureUrl(), user.getRole());
    }
}
