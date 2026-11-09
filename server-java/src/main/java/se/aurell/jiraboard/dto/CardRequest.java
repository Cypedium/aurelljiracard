package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of POST /card and PUT /card/{id}. Author and date always come from the server.
 * {@code type} defaults to task (an issue type key, checked by IssueTypeService); {@code status} is only used on create (a column key or "backlog",
 * checked by ColumnService).
 */
public record CardRequest(
        @NotNull(message = RATING_MESSAGE)
        @Min(value = 1, message = RATING_MESSAGE)
        @Max(value = 5, message = RATING_MESSAGE)
        Integer rating,

        @NotBlank(message = "Summary is required (max 2000 characters).")
        @Size(max = 2000, message = "Summary is required (max 2000 characters).")
        String comment,

        @NotNull(message = PRODUCT_ID_MESSAGE)
        @Size(max = 6, message = PRODUCT_ID_MESSAGE)
        @Pattern(regexp = "^[A-Za-z]+-[0-9]+$", message = PRODUCT_ID_MESSAGE)
        String productId,

        String type,

        String status) {

    static final String RATING_MESSAGE = "Rating must be an integer between 1 and 5.";
    // Issue key in Jira format, e.g. MA-100 (same rule as server/ and the frontend)
    static final String PRODUCT_ID_MESSAGE =
            "Issue key must look like MA-100: letters, a hyphen and digits (max 6 characters).";
}
