package se.aurell.jiraboard.entity;

import java.util.Collection;
import java.util.List;

/**
 * A card's type: the key of an {@link IssueType} (shared by all users, admins add new ones).
 * Must match server/utils/cardType.js and frontend/app/utils/cardType.ts.
 */
public final class CardType {

    public static final String DEFAULT = "task";

    /** Icons an issue type can have; must match ISSUE_TYPE_ICONS in server/utils/cardType.js. */
    public static final List<String> ICONS = List.of("check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb");

    private CardType() {
    }

    /** A new issue type's key from its name ("User story" → "user-story"), unique among the taken keys. */
    public static String keyFromLabel(String label, Collection<String> takenKeys) {
        return CardStatus.uniqueKey(label, takenKeys, "type");
    }
}
