package se.aurell.jiraboard.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
        Card card = new Card(request.rating(), request.comment(), request.productId(), user.username(), Instant.now());
        if (request.type() != null) {
            card.setType(request.type());
        }
        // Lets the board create a card directly in a column
        if (request.status() != null) {
            card.setStatus(request.status());
        }
        cardRepository.save(card);
    }

    /** Only the author may edit; author, date and status are never changed by an edit. */
    @Transactional
    public CardResponse update(UUID id, CardRequest request, AuthUser user) {
        Card card = findOwnCard(id, user, "You can only edit your own card.");
        card.setRating(request.rating());
        card.setComment(request.comment());
        card.setProductId(request.productId());
        if (request.type() != null) {
            card.setType(request.type());
        }
        return CardResponse.from(card);
    }

    /** Any logged-in user may move a card between columns, like in Jira. */
    @Transactional
    public CardResponse updateStatus(UUID id, CardStatus status) {
        Card card = findCard(id);
        card.setStatus(status);
        return CardResponse.from(card);
    }

    @Transactional
    public void delete(UUID id, AuthUser user) {
        cardRepository.delete(findOwnCard(id, user, "You can only delete your own card."));
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
