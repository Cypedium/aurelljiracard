package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotNull;
import se.aurell.jiraboard.entity.CardStatus;

public record CardStatusRequest(
        @NotNull(message = "Status must be one of: todo, in-progress, test, done.") CardStatus status) {
}
