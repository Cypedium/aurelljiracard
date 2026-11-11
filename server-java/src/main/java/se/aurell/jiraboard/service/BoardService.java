package se.aurell.jiraboard.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.BoardMemberResponse;
import se.aurell.jiraboard.dto.BoardResponse;
import se.aurell.jiraboard.dto.InviteResponse;
import se.aurell.jiraboard.entity.Board;
import se.aurell.jiraboard.entity.BoardColumn;
import se.aurell.jiraboard.entity.BoardMember;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.CardType;
import se.aurell.jiraboard.entity.IssueType;
import se.aurell.jiraboard.entity.Role;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.BoardColumnRepository;
import se.aurell.jiraboard.repository.BoardMemberRepository;
import se.aurell.jiraboard.repository.BoardRepository;
import se.aurell.jiraboard.repository.IssueTypeRepository;
import se.aurell.jiraboard.security.AuthUser;

/**
 * Boards and who may use them. Every user owns one board and is its admin; others join it as
 * collaborators ({@link Role#USER}) through an invite link. Non-members get 404, so board ids
 * don't reveal that a board exists. Must match server/controllers/boardController.js.
 */
@Service
public class BoardService {

    static final String BOARD_NOT_FOUND_MESSAGE = "Board not found.";
    static final String BOARD_ADMINS_ONLY_MESSAGE = "Board admins only.";
    static final String INVITE_INVALID_MESSAGE = "This invite link is invalid or has been turned off.";

    private static final int TOKEN_BYTES = 32;
    private static final int TOKEN_MAX_LENGTH = 100;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final BoardRepository boardRepository;
    private final BoardMemberRepository memberRepository;
    private final BoardColumnRepository columnRepository;
    private final IssueTypeRepository issueTypeRepository;

    public BoardService(BoardRepository boardRepository, BoardMemberRepository memberRepository,
            BoardColumnRepository columnRepository, IssueTypeRepository issueTypeRepository) {
        this.boardRepository = boardRepository;
        this.memberRepository = memberRepository;
        this.columnRepository = columnRepository;
        this.issueTypeRepository = issueTypeRepository;
    }

    /** A new user's board, with the default lists and issue types. Runs in the caller's transaction. */
    @Transactional
    public Board createFor(UUID userId) {
        Board board = boardRepository.save(new Board(userId));
        memberRepository.save(new BoardMember(board.getId(), userId, Role.ADMIN));
        for (int i = 0; i < CardStatus.DEFAULT_COLUMNS.size(); i++) {
            var column = CardStatus.DEFAULT_COLUMNS.get(i);
            columnRepository.save(new BoardColumn(board.getId(), column.getKey(), column.getValue(), null, i));
        }
        for (int i = 0; i < CardType.DEFAULTS.size(); i++) {
            CardType.Default type = CardType.DEFAULTS.get(i);
            issueTypeRepository.save(new IssueType(board.getId(), type.key(), type.label(), type.color(), type.icon(), i));
        }
        return board;
    }

    /** The caller's boards: their own first, then the ones they collaborate on by owner name. */
    @Transactional(readOnly = true)
    public List<BoardResponse> getMine(AuthUser user) {
        return memberRepository.findBoardsOf(user.id()).stream()
                .sorted(Comparator.comparing((BoardResponse b) -> b.role() != Role.ADMIN))
                .toList();
    }

    /** The caller's membership; 404 when they are not on the board (or it doesn't exist). */
    @Transactional(readOnly = true)
    public BoardMember requireMember(UUID boardId, AuthUser user) {
        return memberRepository.findByBoardIdAndUserId(boardId, user.id())
                .orElseThrow(() -> ApiException.notFound(BOARD_NOT_FOUND_MESSAGE));
    }

    /** Lists, issue types and invites: only the board admin (its owner). */
    @Transactional(readOnly = true)
    public BoardMember requireAdmin(UUID boardId, AuthUser user) {
        BoardMember member = requireMember(boardId, user);
        if (!member.isAdmin()) {
            throw ApiException.forbidden(BOARD_ADMINS_ONLY_MESSAGE);
        }
        return member;
    }

    /** Board admin: a new invite link; the old one stops working. The token is returned only here. */
    @Transactional
    public InviteResponse createInvite(UUID boardId, AuthUser user) {
        requireAdmin(boardId, user);
        Board board = findBoard(boardId);
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        board.setInviteTokenHash(hash(token));
        return new InviteResponse(token);
    }

    /** Board admin: turns the invite link off. Collaborators who already joined stay. */
    @Transactional
    public void deleteInvite(UUID boardId, AuthUser user) {
        requireAdmin(boardId, user);
        findBoard(boardId).setInviteTokenHash(null);
    }

    /** Any logged-in user: joins the board as a collaborator. Joining again (or your own board) changes nothing. */
    @Transactional
    public BoardResponse join(String token, AuthUser user) {
        if (token == null || token.isBlank() || token.length() > TOKEN_MAX_LENGTH) {
            throw ApiException.notFound(INVITE_INVALID_MESSAGE);
        }
        Board board = boardRepository.findByInviteTokenHash(hash(token))
                .orElseThrow(() -> ApiException.notFound(INVITE_INVALID_MESSAGE));
        if (memberRepository.findByBoardIdAndUserId(board.getId(), user.id()).isEmpty()) {
            memberRepository.save(new BoardMember(board.getId(), user.id(), Role.USER));
        }
        return memberRepository.findBoardsOf(user.id()).stream()
                .filter(b -> b.id().equals(board.getId()))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound(BOARD_NOT_FOUND_MESSAGE));
    }

    /** Members: everyone on the board, the admin first. */
    @Transactional(readOnly = true)
    public List<BoardMemberResponse> getMembers(UUID boardId, AuthUser user) {
        requireMember(boardId, user);
        return memberRepository.findMembers(boardId).stream()
                .sorted(Comparator.comparing((BoardMemberResponse m) -> m.role() != Role.ADMIN))
                .toList();
    }

    /** The board admin removes a collaborator, or a collaborator leaves. The owner cannot leave their own board. */
    @Transactional
    public void removeMember(UUID boardId, UUID userId, AuthUser user) {
        BoardMember caller = requireMember(boardId, user);
        if (userId.equals(user.id())) {
            if (caller.isAdmin()) {
                throw ApiException.badRequest("You cannot leave your own board.");
            }
            memberRepository.delete(caller);
            return;
        }
        if (!caller.isAdmin()) {
            throw ApiException.forbidden(BOARD_ADMINS_ONLY_MESSAGE);
        }
        BoardMember member = memberRepository.findByBoardIdAndUserId(boardId, userId)
                .orElseThrow(() -> ApiException.notFound("Member not found."));
        memberRepository.delete(member);
    }

    private Board findBoard(UUID boardId) {
        return boardRepository.findById(boardId).orElseThrow(() -> ApiException.notFound(BOARD_NOT_FOUND_MESSAGE));
    }

    // Only the hash is stored, so a database leak doesn't leak working links
    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
