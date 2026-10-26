package se.aurell.jiraboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;
import java.util.stream.Collectors;
import se.aurell.jiraboard.exception.ApiException;

/** Board column, shared by all users. Must match DEFAULT_HEADERS keys in frontend/app/utils/boardLayout.ts. */
public enum CardStatus {
    TODO("todo"),
    IN_PROGRESS("in-progress"),
    TEST("test"),
    DONE("done");

    public static final CardStatus DEFAULT = TODO;

    private static final String ALLOWED = Arrays.stream(values())
            .map(CardStatus::getValue)
            .collect(Collectors.joining(", "));

    private final String value;

    CardStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CardStatus fromValue(String value) {
        return Arrays.stream(values())
                .filter(s -> s.value.equals(value))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("Status must be one of: " + ALLOWED + "."));
    }
}
