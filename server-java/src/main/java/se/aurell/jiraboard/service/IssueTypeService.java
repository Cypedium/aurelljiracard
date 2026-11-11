package se.aurell.jiraboard.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.IssueTypeRequest;
import se.aurell.jiraboard.dto.IssueTypeResponse;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.CardType;
import se.aurell.jiraboard.entity.IssueType;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.repository.IssueTypeRepository;
import se.aurell.jiraboard.security.AuthUser;

/** A board's issue types: its members read them, the board admin adds and deletes them. */
@Service
public class IssueTypeService {

    static final int MAX_ISSUE_TYPES = 12;

    private final IssueTypeRepository issueTypeRepository;
    private final CardRepository cardRepository;
    private final BoardService boardService;

    public IssueTypeService(IssueTypeRepository issueTypeRepository, CardRepository cardRepository,
            BoardService boardService) {
        this.issueTypeRepository = issueTypeRepository;
        this.cardRepository = cardRepository;
        this.boardService = boardService;
    }

    @Transactional(readOnly = true)
    public List<IssueTypeResponse> getAll(UUID boardId, AuthUser user) {
        boardService.requireMember(boardId, user);
        return findAll(boardId).stream().map(IssueTypeResponse::from).toList();
    }

    /** Board admin: adds an issue type at the end of the dropdown, with a key made from its name. */
    @Transactional
    public IssueTypeResponse create(UUID boardId, IssueTypeRequest request, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        if (request.icon() == null || !CardType.ICONS.contains(request.icon())) {
            throw ApiException.badRequest("Icon must be one of: " + String.join(", ", CardType.ICONS) + ".");
        }
        List<IssueType> types = findAll(boardId);
        if (types.size() >= MAX_ISSUE_TYPES) {
            throw ApiException.badRequest("There can be at most " + MAX_ISSUE_TYPES + " issue types.");
        }
        String key = CardType.keyFromLabel(request.label(), types.stream().map(IssueType::getTypeKey).toList());
        int position = types.stream().mapToInt(IssueType::getPosition).max().orElse(-1) + 1;
        try {
            return IssueTypeResponse.from(issueTypeRepository.saveAndFlush(new IssueType(boardId, key, request.label().trim(),
                    request.color().toLowerCase(Locale.ROOT), request.icon(), position)));
        } catch (DataIntegrityViolationException e) {
            // Another admin added an issue type with the same name in between
            throw ApiException.conflict("An issue type with this name was just added. Try again.");
        }
    }

    /** Board admin: removes an issue type that no card on the board uses. The default type stays. */
    @Transactional
    public void delete(UUID boardId, String key, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        // Issue type keys have the same format as list keys
        if (!CardStatus.isColumnKey(key)) {
            throw ApiException.badRequest("Invalid issue type.");
        }
        if (CardType.DEFAULT.equals(key)) {
            throw ApiException.badRequest("The default issue type cannot be deleted.");
        }
        IssueType type = issueTypeRepository.findByBoardIdAndTypeKey(boardId, key)
                .orElseThrow(() -> ApiException.notFound("Issue type not found."));
        if (cardRepository.existsByBoardIdAndType(boardId, key)) {
            throw ApiException.conflict("Cards still use this issue type. Change or delete them first.");
        }
        issueTypeRepository.delete(type);
    }

    /** A card's type must be an issue type key on its board; the message lists the valid ones. */
    @Transactional(readOnly = true)
    public void requireCardType(UUID boardId, String type) {
        List<String> types = findAll(boardId).stream().map(IssueType::getTypeKey).toList();
        if (type == null || !types.contains(type)) {
            throw ApiException.badRequest("Type must be one of: " + String.join(", ", types) + ".");
        }
    }

    private List<IssueType> findAll(UUID boardId) {
        return issueTypeRepository.findAllByBoardIdOrderByPositionAscTypeKeyAsc(boardId);
    }
}
