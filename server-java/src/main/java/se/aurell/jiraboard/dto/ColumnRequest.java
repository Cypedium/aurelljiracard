package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /column and PUT /column/{key}; {@code color} null means the default colour. */
public record ColumnRequest(
        @NotBlank(message = TITLE_MESSAGE)
        @Size(max = 50, message = TITLE_MESSAGE)
        String title,

        // Must match HEX_COLOR in server/controllers/columnController.js
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "List color must be a hex color like #eed7fc.")
        String color) {

    static final String TITLE_MESSAGE = "List name is required (max 50 characters).";
}
