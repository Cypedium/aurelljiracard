package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.CardType;

/**
 * Body of POST /card and PUT /card/{id}. Author and date always come from the server.
 * {@code type} defaults to task; {@code status} is only used on create (board column).
 */
public record CardRequest(
        @NotNull(message = RATING_MESSAGE)
        @Min(value = 1, message = RATING_MESSAGE)
        @Max(value = 5, message = RATING_MESSAGE)
        Integer rating,

        @NotBlank(message = "Summary is required (max 2000 characters).")
        @Size(max = 2000, message = "Summary is required (max 2000 characters).")
        String comment,

        @NotBlank(message = "Issue key is required (max 200 characters).")
        @Size(max = 200, message = "Issue key is required (max 200 characters).")
        String productId,

        CardType type,

        CardStatus status) {

    static final String RATING_MESSAGE = "Rating must be an integer between 1 and 5.";
}
