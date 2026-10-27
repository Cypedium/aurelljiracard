package se.aurell.jiraboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;
import se.aurell.jiraboard.entity.Card;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.CardType;

/** Same shape as the Express API, including the MongoDB-style "_id" the frontend reads. */
public record CardResponse(
        @JsonProperty("_id") UUID id,
        int rating,
        String comment,
        String productId,
        String username,
        Instant submittedAt,
        CardStatus status,
        CardType type) {

    public static CardResponse from(Card card) {
        return new CardResponse(card.getId(), card.getRating(), card.getComment(), card.getProductId(),
                card.getUsername(), card.getSubmittedAt(), card.getStatus(), card.getType());
    }
}
