package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.Card;

public interface CardRepository extends JpaRepository<Card, UUID> {

    List<Card> findAllByOrderBySubmittedAtDesc();
}
