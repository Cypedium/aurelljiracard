package se.aurell.jiraboard.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
import se.aurell.jiraboard.security.AuthUser;

/** Board columns are shared: everyone reads them, admins add, rename, recolour and move them. */
@Service
public class ColumnService {

    static final int MAX_COLUMNS = 12;

    private final BoardColumnRepository columnRepository;

    public ColumnService(BoardColumnRepository columnRepository) {
        this.columnRepository = columnRepository;
    }

    @Transactional(readOnly = true)
    public List<ColumnResponse> getAll() {
        return findAll().stream().map(ColumnResponse::from).toList();
    }

    /** Admin: adds a list at the end of the board, with a key made from its title. */
    @Transactional
    public ColumnResponse create(ColumnRequest request, AuthUser user) {
        requireAdmin(user);
        List<BoardColumn> columns = findAll();
        if (columns.size() >= MAX_COLUMNS) {
            throw ApiException.badRequest("The board can have at most " + MAX_COLUMNS + " lists.");
        }
        String key = CardStatus.keyFromTitle(request.title(), columns.stream().map(BoardColumn::getColumnKey).toList());
        int position = columns.stream().mapToInt(BoardColumn::getPosition).max().orElse(-1) + 1;
        try {
            return ColumnResponse.from(columnRepository.saveAndFlush(
                    new BoardColumn(key, request.title().trim(), toColor(request.color()), position)));
        } catch (DataIntegrityViolationException e) {
            // Another admin added a list with the same name in between
            throw ApiException.conflict("A list with this name was just added. Try again.");
        }
    }

    /** Admin: renames and/or recolours a list for everyone (replaces title and color). */
    @Transactional
    public ColumnResponse update(String key, ColumnRequest request, AuthUser user) {
        requireAdmin(user);
        if (!CardStatus.isColumnKey(key)) {
            throw ApiException.badRequest("Invalid list key.");
        }
        BoardColumn column = columnRepository.findById(key).orElseThrow(() -> ApiException.notFound("List not found."));
        column.setTitle(request.title().trim());
        column.setColor(toColor(request.color()));
        return ColumnResponse.from(column);
    }

    /** Admin: sets the order of all lists for everyone; keys must be every list exactly once. */
    @Transactional
    public List<ColumnResponse> reorder(ColumnOrderRequest request, AuthUser user) {
        requireAdmin(user);
        List<String> keys = request.keys();
        Map<String, BoardColumn> byKey = findAll().stream()
                .collect(Collectors.toMap(BoardColumn::getColumnKey, Function.identity()));
        if (keys.size() != byKey.size() || new HashSet<>(keys).size() != keys.size() || !byKey.keySet().containsAll(keys)) {
            throw ApiException.badRequest(ColumnOrderRequest.ORDER_MESSAGE);
        }
        for (int position = 0; position < keys.size(); position++) {
            byKey.get(keys.get(position)).setPosition(position);
        }
        return keys.stream().map(key -> ColumnResponse.from(byKey.get(key))).toList();
    }

    /** A card's status must be a column key or the backlog; the message lists the valid ones. */
    @Transactional(readOnly = true)
    public void requireCardStatus(String status) {
        List<String> statuses = new ArrayList<>(findAll().stream().map(BoardColumn::getColumnKey).toList());
        statuses.add(CardStatus.BACKLOG);
        if (status == null || !statuses.contains(status)) {
            throw ApiException.badRequest("Status must be one of: " + String.join(", ", statuses) + ".");
        }
    }

    private List<BoardColumn> findAll() {
        return columnRepository.findAllByOrderByPositionAscColumnKeyAsc();
    }

    private static String toColor(String color) {
        return color == null ? null : color.toLowerCase(Locale.ROOT);
    }

    private static void requireAdmin(AuthUser user) {
        if (!user.isAdmin()) {
            throw ApiException.forbidden("Admins only.");
        }
    }
}
