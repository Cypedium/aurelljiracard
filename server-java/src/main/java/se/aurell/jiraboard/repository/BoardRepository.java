package se.aurell.jiraboard.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import se.aurell.jiraboard.entity.Board;

public interface BoardRepository extends JpaRepository<Board, UUID> {

    Optional<Board> findByOwnerId(UUID ownerId);

    Optional<Board> findByInviteTokenHash(String inviteTokenHash);
}
