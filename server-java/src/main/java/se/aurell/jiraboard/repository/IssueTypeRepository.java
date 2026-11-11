package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.IssueType;

public interface IssueTypeRepository extends JpaRepository<IssueType, IssueType.Key> {

    List<IssueType> findAllByBoardIdOrderByPositionAscTypeKeyAsc(UUID boardId);

    Optional<IssueType> findByBoardIdAndTypeKey(UUID boardId, String typeKey);
}
