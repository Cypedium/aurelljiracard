package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.Card;

public interface CardRepository extends JpaRepository<Card, UUID> {

    List<Card> findAllByBoardIdOrderBySubmittedAtDesc(UUID boardId);

    Optional<Card> findByIdAndBoardId(UUID id, UUID boardId);

    boolean existsByBoardIdAndProductId(UUID boardId, String productId);

    boolean existsByBoardIdAndProductIdAndIdNot(UUID boardId, String productId, UUID id);

    boolean existsByBoardIdAndType(UUID boardId, String type);

    boolean existsByBoardIdAndStatus(UUID boardId, String status);

    boolean existsByBoardId(UUID boardId);

    boolean existsByUsername(String username);
}
