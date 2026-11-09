package se.aurell.jiraboard.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.IssueType;

public interface IssueTypeRepository extends JpaRepository<IssueType, String> {

    List<IssueType> findAllByOrderByPositionAscTypeKeyAsc();
}
