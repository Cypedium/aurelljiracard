package se.aurell.jiraboard.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.BoardColumn;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, String> {

    List<BoardColumn> findAllByOrderByPositionAscColumnKeyAsc();
}
