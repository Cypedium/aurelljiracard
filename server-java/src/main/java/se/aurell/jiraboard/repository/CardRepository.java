package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.Card;

public interface CardRepository extends JpaRepository<Card, UUID> {

    List<Card> findAllByOrderBySubmittedAtDesc();

    boolean existsByProductId(String productId);

    boolean existsByProductIdAndIdNot(String productId, UUID id);
}
