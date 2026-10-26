package se.aurell.jiraboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;
import java.util.stream.Collectors;
import se.aurell.jiraboard.exception.ApiException;

/** Issue type. Must match CARD_TYPES in frontend/app/utils/cardType.ts. */
public enum CardType {
    TASK("task"),
    BUG("bug"),
    DOC("doc");

    public static final CardType DEFAULT = TASK;

    private static final String ALLOWED = Arrays.stream(values())
            .map(CardType::getValue)
            .collect(Collectors.joining(", "));

    private final String value;

    CardType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CardType fromValue(String value) {
        return Arrays.stream(values())
                .filter(t -> t.value.equals(value))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("Type must be one of: " + ALLOWED + "."));
    }
}
