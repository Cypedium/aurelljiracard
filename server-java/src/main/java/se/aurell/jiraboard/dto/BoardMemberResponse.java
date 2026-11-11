package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;
import se.aurell.jiraboard.entity.Role;

/** A member in GET /board/{id}/member: { _id (the user's id), username, pictureUrl, role }. */
public record BoardMemberResponse(@JsonProperty("_id") UUID id, String username, String pictureUrl, Role role) {
}
