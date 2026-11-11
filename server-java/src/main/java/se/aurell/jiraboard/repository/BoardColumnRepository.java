package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.BoardColumn;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, BoardColumn.Key> {

    List<BoardColumn> findAllByBoardIdOrderByPositionAscColumnKeyAsc(UUID boardId);

    Optional<BoardColumn> findByBoardIdAndColumnKey(UUID boardId, String columnKey);
}
