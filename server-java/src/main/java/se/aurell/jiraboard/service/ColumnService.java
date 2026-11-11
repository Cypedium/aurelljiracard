package se.aurell.jiraboard.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.ColumnOrderRequest;
import se.aurell.jiraboard.dto.ColumnRequest;
import se.aurell.jiraboard.dto.ColumnResponse;
import se.aurell.jiraboard.entity.BoardColumn;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.BoardColumnRepository;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.security.AuthUser;

/** A board's lists: its members read them, the board admin adds, renames, recolours, moves and deletes them. */
@Service
public class ColumnService {

    static final int MAX_COLUMNS = 12;

    private final BoardColumnRepository columnRepository;
    private final CardRepository cardRepository;
    private final BoardService boardService;

    public ColumnService(BoardColumnRepository columnRepository, CardRepository cardRepository,
            BoardService boardService) {
        this.columnRepository = columnRepository;
        this.cardRepository = cardRepository;
        this.boardService = boardService;
    }

    @Transactional(readOnly = true)
    public List<ColumnResponse> getAll(UUID boardId, AuthUser user) {
        boardService.requireMember(boardId, user);
        return findAll(boardId).stream().map(ColumnResponse::from).toList();
    }

    /** Board admin: adds a list at the end of the board, with a key made from its title. */
    @Transactional
    public ColumnResponse create(UUID boardId, ColumnRequest request, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        List<BoardColumn> columns = findAll(boardId);
        if (columns.size() >= MAX_COLUMNS) {
            throw ApiException.badRequest("The board can have at most " + MAX_COLUMNS + " lists.");
        }
        String key = CardStatus.keyFromTitle(request.title(), columns.stream().map(BoardColumn::getColumnKey).toList());
        int position = columns.stream().mapToInt(BoardColumn::getPosition).max().orElse(-1) + 1;
        try {
            return ColumnResponse.from(columnRepository.saveAndFlush(
                    new BoardColumn(boardId, key, request.title().trim(), toColor(request.color()), position)));
        } catch (DataIntegrityViolationException e) {
            // Another admin added a list with the same name in between
            throw ApiException.conflict("A list with this name was just added. Try again.");
        }
    }

    /** Board admin: renames and/or recolours a list (replaces title and color). */
    @Transactional
    public ColumnResponse update(UUID boardId, String key, ColumnRequest request, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        if (!CardStatus.isColumnKey(key)) {
            throw ApiException.badRequest("Invalid list key.");
        }
        BoardColumn column = findColumn(boardId, key);
        column.setTitle(request.title().trim());
        column.setColor(toColor(request.color()));
        return ColumnResponse.from(column);
    }

    /** Board admin: sets the order of all lists; keys must be every list exactly once. */
    @Transactional
    public List<ColumnResponse> reorder(UUID boardId, ColumnOrderRequest request, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        List<String> keys = request.keys();
        Map<String, BoardColumn> byKey = findAll(boardId).stream()
                .collect(Collectors.toMap(BoardColumn::getColumnKey, Function.identity()));
        if (keys.size() != byKey.size() || new HashSet<>(keys).size() != keys.size() || !byKey.keySet().containsAll(keys)) {
            throw ApiException.badRequest(ColumnOrderRequest.ORDER_MESSAGE);
        }
        for (int position = 0; position < keys.size(); position++) {
            byKey.get(keys.get(position)).setPosition(position);
        }
        return keys.stream().map(key -> ColumnResponse.from(byKey.get(key))).toList();
    }

    /** Board admin: removes an empty list. The default list stays: cards created without a status go there. */
    @Transactional
    public void delete(UUID boardId, String key, AuthUser user) {
        boardService.requireAdmin(boardId, user);
        if (!CardStatus.isColumnKey(key)) {
            throw ApiException.badRequest("Invalid list key.");
        }
        if (CardStatus.DEFAULT.equals(key)) {
            throw ApiException.badRequest("The default list cannot be deleted.");
        }
        BoardColumn column = findColumn(boardId, key);
        if (cardRepository.existsByBoardIdAndStatus(boardId, key)) {
            throw ApiException.conflict("The list still has cards. Move or delete them first.");
        }
        columnRepository.delete(column);
    }

    /** A card's status must be a column key on its board or the backlog; the message lists the valid ones. */
    @Transactional(readOnly = true)
    public void requireCardStatus(UUID boardId, String status) {
        List<String> statuses = new ArrayList<>(findAll(boardId).stream().map(BoardColumn::getColumnKey).toList());
        statuses.add(CardStatus.BACKLOG);
        if (status == null || !statuses.contains(status)) {
            throw ApiException.badRequest("Status must be one of: " + String.join(", ", statuses) + ".");
        }
    }

    private List<BoardColumn> findAll(UUID boardId) {
        return columnRepository.findAllByBoardIdOrderByPositionAscColumnKeyAsc(boardId);
    }

    private BoardColumn findColumn(UUID boardId, String key) {
        return columnRepository.findByBoardIdAndColumnKey(boardId, key)
                .orElseThrow(() -> ApiException.notFound("List not found."));
    }

    private static String toColor(String color) {
        return color == null ? null : color.toLowerCase(Locale.ROOT);
    }
}
