package se.aurell.jiraboard.dto;

import se.aurell.jiraboard.entity.BoardColumn;

/** Same shape as the Express API: { key, title, color, position }. */
public record ColumnResponse(String key, String title, String color, int position) {

    public static ColumnResponse from(BoardColumn column) {
        return new ColumnResponse(column.getColumnKey(), column.getTitle(), column.getColor(), column.getPosition());
    }
}
