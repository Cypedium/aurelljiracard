package se.aurell.jiraboard.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.CardRequest;
import se.aurell.jiraboard.dto.CardResponse;
import se.aurell.jiraboard.entity.BoardMember;
import se.aurell.jiraboard.entity.Card;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.security.AuthUser;

/** Cards on one board: members read, create and move them; the author or the board admin edits and deletes. */
@Service
public class CardService {

    private static final String DUPLICATE_KEY_MESSAGE = "Issue key already exists.";

    private final CardRepository cardRepository;
    private final ColumnService columnService;
    private final IssueTypeService issueTypeService;
    private final BoardService boardService;

    public CardService(CardRepository cardRepository, ColumnService columnService, IssueTypeService issueTypeService,
            BoardService boardService) {
        this.cardRepository = cardRepository;
        this.columnService = columnService;
        this.issueTypeService = issueTypeService;
        this.boardService = boardService;
    }

    @Transactional(readOnly = true)
    public List<CardResponse> getAll(UUID boardId, AuthUser user) {
        boardService.requireMember(boardId, user);
        return cardRepository.findAllByBoardIdOrderBySubmittedAtDesc(boardId).stream().map(CardResponse::from).toList();
    }

    /** Author comes from the token and the date is always now, never from the request body. */
    @Transactional
    public void create(UUID boardId, CardRequest request, AuthUser user) {
        boardService.requireMember(boardId, user);
        if (request.type() != null) {
            issueTypeService.requireCardType(boardId, request.type());
        }
        if (request.status() != null) {
            columnService.requireCardStatus(boardId, request.status());
        }
        if (cardRepository.existsByBoardIdAndProductId(boardId, request.productId())) {
            throw ApiException.conflict(DUPLICATE_KEY_MESSAGE);
        }
        Card card = new Card(boardId, request.rating(), request.comment(), request.productId(), user.username(),
                Instant.now());
        if (request.type() != null) {
            card.setType(request.type());
        }
        // Lets the board create a card directly in a column, or in the backlog
        if (request.status() != null) {
            card.setStatus(request.status());
        }
        // Cards on the board are assigned to their author; backlog cards to no one
        card.setAssignee(isBacklog(card.getStatus()) ? null : user.username());
        saveUnique(card);
    }

    /** The author or the board admin may edit; author, date and status are never changed by an edit. */
    @Transactional
    public CardResponse update(UUID boardId, UUID id, CardRequest request, AuthUser user) {
        BoardMember member = boardService.requireMember(boardId, user);
        if (request.type() != null) {
            issueTypeService.requireCardType(boardId, request.type());
        }
        Card card = findEditableCard(boardId, id, member, user, "You can only edit your own card.");
        if (cardRepository.existsByBoardIdAndProductIdAndIdNot(boardId, request.productId(), id)) {
            throw ApiException.conflict(DUPLICATE_KEY_MESSAGE);
        }
        card.setRating(request.rating());
        card.setComment(request.comment());
        card.setProductId(request.productId());
        if (request.type() != null) {
            card.setType(request.type());
        }
        return CardResponse.from(saveUnique(card));
    }

    /**
     * Any board member may move a card between columns, like in Jira. Taking a card from the
     * backlog assigns it to the caller; moving it to the backlog unassigns it.
     */
    @Transactional
    public CardResponse updateStatus(UUID boardId, UUID id, String status, AuthUser user) {
        boardService.requireMember(boardId, user);
        columnService.requireCardStatus(boardId, status);
        Card card = findCard(boardId, id);
        if (isBacklog(status)) {
            card.setAssignee(null);
        } else if (isBacklog(card.getStatus())) {
            card.setAssignee(user.username());
        }
        card.setStatus(status);
        return CardResponse.from(card);
    }

    /** The author or the board admin may delete. */
    @Transactional
    public void delete(UUID boardId, UUID id, AuthUser user) {
        BoardMember member = boardService.requireMember(boardId, user);
        Card card = findEditableCard(boardId, id, member, user, "You can only delete your own card.");
        cardRepository.delete(card);
    }

    private static boolean isBacklog(String status) {
        return CardStatus.BACKLOG.equals(status);
    }

    private Card saveUnique(Card card) {
        try {
            return cardRepository.saveAndFlush(card);
        } catch (DataIntegrityViolationException e) {
            // Another request saved the same issue key in between
            throw ApiException.conflict(DUPLICATE_KEY_MESSAGE);
        }
    }

    // A card on another board is "not found", like a board you are not on
    private Card findCard(UUID boardId, UUID id) {
        return cardRepository.findByIdAndBoardId(id, boardId).orElseThrow(() -> ApiException.notFound("Card not found."));
    }

    private Card findEditableCard(UUID boardId, UUID id, BoardMember member, AuthUser user, String forbiddenMessage) {
        Card card = findCard(boardId, id);
        if (!member.isAdmin() && !card.getUsername().equals(user.username())) {
            throw ApiException.forbidden(forbiddenMessage);
        }
        return card;
    }
}
