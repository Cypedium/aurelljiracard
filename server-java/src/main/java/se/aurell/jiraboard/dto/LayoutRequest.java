package se.aurell.jiraboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.Layout;

/** Body of PUT /user/layout; fields left out keep their saved value. */
public record LayoutRequest(
        @Min(value = 1, message = "cols must be an integer between 1 and 12.")
        @Max(value = 12, message = "cols must be an integer between 1 and 12.")
        Integer cols,

        List<@NotNull(message = HEADER_MESSAGE) @Valid HeaderRequest> headers,

        List<Layout.CardPosition> cards) {

    static final String HEADER_MESSAGE = "Each header needs a valid key and a title (max 50 characters).";

    public record HeaderRequest(
            @NotNull(message = HEADER_MESSAGE) CardStatus key,
            @NotBlank(message = HEADER_MESSAGE) @Size(max = 50, message = HEADER_MESSAGE) String title) {
    }
}
