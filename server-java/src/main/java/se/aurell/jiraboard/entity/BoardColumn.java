package se.aurell.jiraboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;

/** A list on one board, seen by its members. Cards on the board point at it with status = key. */
@Entity
@Table(name = "board_columns")
@IdClass(BoardColumn.Key.class)
public class BoardColumn {

    public record Key(UUID boardId, String columnKey) implements Serializable {
        public Key() {
            this(null, null);
        }
    }

    @Id
    @Column(name = "board_id")
    private UUID boardId;

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

    public BoardColumn(UUID boardId, String columnKey, String title, String color, int position) {
        this.boardId = boardId;
        this.columnKey = columnKey;
        this.title = title;
        this.color = color;
        this.position = position;
    }

    public UUID getBoardId() {
        return boardId;
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

    public void setPosition(int position) {
        this.position = position;
    }
}
