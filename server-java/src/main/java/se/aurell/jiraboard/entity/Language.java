package se.aurell.jiraboard.entity;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The UI language a user picked (account menu). Must match "languages" in shared/contract.json and the CHECK in
 * V13__user_language.sql.
 */
public enum Language {
    EN("en"),
    SV("sv");

    public static final String ALLOWED = Arrays.stream(values()).map(Language::getValue).collect(Collectors.joining(", "));

    private final String value;

    Language(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /** Strict lookup for request bodies; empty for unknown values. */
    public static Optional<Language> parse(String value) {
        return Arrays.stream(values()).filter(l -> l.value.equals(value)).findFirst();
    }
}
