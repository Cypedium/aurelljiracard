package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A board column (list), shared by all users. Cards point at it with status = key. */
@Entity
@Table(name = "board_columns")
public class BoardColumn {

    @Id
    @Column(name = "column_key", length = 32)
    private String columnKey;

    @Column(nullable = false, length = 50)
    private String title;

    // #rrggbb, lowercase; null = the default colour
    @Column(length = 7)
    private String color;

    // Order on the board, left to right
    @Column(nullable = false)
    private int position;

    protected BoardColumn() {
    }

    public BoardColumn(String columnKey, String title, String color, int position) {
        this.columnKey = columnKey;
        this.title = title;
        this.color = color;
        this.position = position;
    }

    public String getColumnKey() {
        return columnKey;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getPosition() {
        return position;
    }
}
