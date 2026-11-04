package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** Body of PUT /column: every list key exactly once, in the new board order. */
public record ColumnOrderRequest(
        @NotNull(message = ORDER_MESSAGE) List<@NotNull(message = ORDER_MESSAGE) String> keys) {

    public static final String ORDER_MESSAGE = "List order must contain every list exactly once.";
}
