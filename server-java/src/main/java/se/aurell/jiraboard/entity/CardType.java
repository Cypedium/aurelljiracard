package se.aurell.jiraboard.entity;

import java.util.Collection;
import java.util.List;

/**
 * A card's type: the key of an {@link IssueType} on the card's board (the board admin adds new ones).
 * Must match server/utils/cardType.js and frontend/app/utils/cardType.ts.
 */
public final class CardType {

    public static final String DEFAULT = "task";

    /** Icons an issue type can have; must match ISSUE_TYPE_ICONS in server/utils/cardType.js. */
    /** An issue type a new board starts with. */
    public record Default(String key, String label, String color, String icon) {
    }

    /** Must match DEFAULT_ISSUE_TYPES in server/utils/cardType.js and V11. */
    public static final List<Default> DEFAULTS = List.of(
            new Default("task", "Task", "#4bade8", "check"),
            new Default("bug", "Bug", "#c9372c", "bug"),
            new Default("doc", "Doc", "#8270db", "doc"));

    public static final List<String> ICONS = List.of("check", "bug", "doc", "bolt", "star", "flag", "wrench", "light-bulb");

    private CardType() {
    }

    /** A new issue type's key from its name ("User story" → "user-story"), unique among the taken keys. */
    public static String keyFromLabel(String label, Collection<String> takenKeys) {
        return CardStatus.uniqueKey(label, takenKeys, "type");
    }
}
