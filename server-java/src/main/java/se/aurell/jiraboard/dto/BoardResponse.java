package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;
import se.aurell.jiraboard.entity.Board;
import se.aurell.jiraboard.entity.Role;

/** A board in GET /board: { _id, name, owner, role }; role is the caller's role on it. */
public record BoardResponse(@JsonProperty("_id") UUID id, String name, String owner, Role role) {

    public BoardResponse(UUID id, String owner, Role role) {
        this(id, Board.nameFor(owner), owner, role);
    }
}
