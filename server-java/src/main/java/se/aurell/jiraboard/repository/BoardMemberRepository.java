package se.aurell.jiraboard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import se.aurell.jiraboard.dto.BoardMemberResponse;
import se.aurell.jiraboard.dto.BoardResponse;
import se.aurell.jiraboard.entity.BoardMember;

public interface BoardMemberRepository extends JpaRepository<BoardMember, BoardMember.Key> {

    Optional<BoardMember> findByBoardIdAndUserId(UUID boardId, UUID userId);

    /** The boards the user owns or collaborates on, with their role on each. */
    @Query("select new se.aurell.jiraboard.dto.BoardResponse(b.id, o.username, m.role) "
            + "from BoardMember m join Board b on b.id = m.boardId join User o on o.id = b.ownerId "
            + "where m.userId = :userId order by o.username")
    List<BoardResponse> findBoardsOf(UUID userId);

    @Query("select new se.aurell.jiraboard.dto.BoardMemberResponse(u.id, u.username, u.pictureUrl, m.role) "
            + "from BoardMember m join User u on u.id = m.userId "
            + "where m.boardId = :boardId order by u.username")
    List<BoardMemberResponse> findMembers(UUID boardId);
}
