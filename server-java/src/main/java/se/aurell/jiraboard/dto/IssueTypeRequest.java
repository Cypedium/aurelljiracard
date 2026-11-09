package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /issue-type; the icon is checked against CardType.ICONS in IssueTypeService. */
public record IssueTypeRequest(
        @NotBlank(message = LABEL_MESSAGE)
        @Size(max = 30, message = LABEL_MESSAGE)
        String label,

        // Must match HEX_COLOR in server/controllers/issueTypeController.js
        @NotNull(message = COLOR_MESSAGE)
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = COLOR_MESSAGE)
        String color,

        String icon) {

    static final String LABEL_MESSAGE = "Issue type name is required (max 30 characters).";
    static final String COLOR_MESSAGE = "Issue type color must be a hex color like #4bade8.";
}
