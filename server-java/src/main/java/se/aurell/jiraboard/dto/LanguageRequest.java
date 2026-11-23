package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;

/** Body of PUT /user/language. The value is checked against Language in UserService. */
public record LanguageRequest(@NotBlank(message = LanguageRequest.MESSAGE) String language) {

    public static final String MESSAGE = "Language must be one of: en, sv.";
}
