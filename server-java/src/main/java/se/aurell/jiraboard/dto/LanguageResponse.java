package se.aurell.jiraboard.dto;

import se.aurell.jiraboard.entity.Language;

/** GET/PUT /user/language: { language: "en" | "sv" | null }; null = the user hasn't picked one. */
public record LanguageResponse(Language language) {
}
