package se.aurell.jiraboard.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.CardRequest;
import se.aurell.jiraboard.dto.CardResponse;
import se.aurell.jiraboard.entity.Card;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.CardRepository;
import se.aurell.jiraboard.security.AuthUser;

@Service
public class CardService {

    private static final String DUPLICATE_KEY_MESSAGE = "Issue key already exists.";

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    @Transactional(readOnly = true)
    public List<CardResponse> getAll() {
        return cardRepository.findAllByOrderBySubmittedAtDesc().stream().map(CardResponse::from).toList();
    }

    /** Author comes from the token and the date is always now, never from the request body. */
    @Transactional
    public void create(CardRequest request, AuthUser user) {
        if (cardRepository.existsByProductId(request.productId())) {
            throw ApiException.conflict(DUPLICATE_KEY_MESSAGE);
        }
        Card card = new Card(request.rating(), request.comment(), request.productId(), user.username(), Instant.now());
        if (request.type() != null) {
            card.setType(request.type());
        }
        // Lets the board create a card directly in a column, or in the backlog
        if (request.status() != null) {
            card.setStatus(request.status());
        }
        // Cards on the board are assigned to their author; backlog cards to no one
        card.setAssignee(card.getStatus().isBoardColumn() ? user.username() : null);
        saveUnique(card);
    }

    /** The author or an admin may edit; author, date and status are never changed by an edit. */
    @Transactional
    public CardResponse update(UUID id, CardRequest request, AuthUser user) {
        Card card = user.isAdmin() ? findCard(id) : findOwnCard(id, user, "You can only edit your own card.");
        if (cardRepository.existsByProductIdAndIdNot(request.productId(), id)) {
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
     * Any logged-in user may move a card between columns, like in Jira. Taking a card from the
     * backlog assigns it to the caller; moving it to the backlog unassigns it.
     */
    @Transactional
    public CardResponse updateStatus(UUID id, CardStatus status, AuthUser user) {
        Card card = findCard(id);
        if (!status.isBoardColumn()) {
            card.setAssignee(null);
        } else if (!card.getStatus().isBoardColumn()) {
            card.setAssignee(user.username());
        }
        card.setStatus(status);
        return CardResponse.from(card);
    }

    /** The author or an admin may delete. */
    @Transactional
    public void delete(UUID id, AuthUser user) {
        Card card = user.isAdmin() ? findCard(id) : findOwnCard(id, user, "You can only delete your own card.");
        cardRepository.delete(card);
    }

    private Card saveUnique(Card card) {
        try {
            return cardRepository.saveAndFlush(card);
        } catch (DataIntegrityViolationException e) {
            // Another request saved the same issue key in between
            throw ApiException.conflict(DUPLICATE_KEY_MESSAGE);
        }
    }

    private Card findCard(UUID id) {
        return cardRepository.findById(id).orElseThrow(() -> ApiException.notFound("Card not found."));
    }

    private Card findOwnCard(UUID id, AuthUser user, String forbiddenMessage) {
        Card card = findCard(id);
        if (!card.getUsername().equals(user.username())) {
            throw ApiException.forbidden(forbiddenMessage);
        }
        return card;
    }
}
