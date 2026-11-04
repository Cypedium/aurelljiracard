package se.aurell.jiraboard.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Board layout stored as JSONB on the user. The board only reads {@code cards}, for the
 * order of cards within a column; cols/headers are written as the fixed four columns.
 */
public record Layout(int cols, List<Header> headers, List<CardPosition> cards) {
    // Legacy: list names and colours are shared now (BoardColumn); the frontend no longer sends headers

    public static final int DEFAULT_COLS = 12;

    public static Layout empty() {
        return new Layout(DEFAULT_COLS, List.of(), List.of());
    }

    /** {@code color} is an optional list colour (#rrggbb); null means the default. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Header(String key, String title, String color) {
    }

    /**
     * A react-grid-layout item; {@code status} is the list key ({@code x} is the list index, which
     * changes when lists are moved), {@code content} is opaque client data.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CardPosition(String id, Integer x, Integer y, Integer w, Integer h, String status, Object content) {
    }
}
