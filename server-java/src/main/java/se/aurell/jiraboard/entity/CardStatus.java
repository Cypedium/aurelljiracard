package se.aurell.jiraboard.entity;

import java.text.Normalizer;
import java.util.Collection;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * A card's status: the key of a {@link BoardColumn} (shared by all users) or {@link #BACKLOG}.
 * Backlog cards are listed on /backlog and have no assignee. Must match server/utils/cardStatus.js.
 */
public final class CardStatus {

    public static final String BACKLOG = "backlog";
    public static final String DEFAULT = "todo";

    /** Column keys: lowercase letters and digits joined by single hyphens, e.g. "in-progress". */
    public static final String KEY_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
    public static final int KEY_MAX_LENGTH = 32;
    // Room for a "-NN" suffix when two lists get the same name
    private static final int KEY_BASE_LENGTH = 24;

    private CardStatus() {
    }

    public static boolean isColumnKey(String value) {
        return value != null && value.length() <= KEY_MAX_LENGTH && value.matches(KEY_PATTERN) && !BACKLOG.equals(value);
    }

    /** A new column's key from its title ("Code review" → "code-review"), unique among the taken keys. */
    public static String keyFromTitle(String title, Collection<String> takenKeys) {
        Set<String> taken = new HashSet<>(takenKeys);
        taken.add(BACKLOG);
        return uniqueKey(title, taken, "list");
    }

    /**
     * A key made from a name, unique among the taken keys ("done" taken → "done-2"); {@code fallback}
     * when nothing is left of the name. Also used for issue type keys ({@link CardType#keyFromLabel}).
     */
    public static String uniqueKey(String title, Collection<String> takenKeys, String fallback) {
        Set<String> taken = new HashSet<>(takenKeys);
        String base = slugify(title, fallback);
        if (!taken.contains(base)) {
            return base;
        }
        for (int n = 2; ; n++) {
            String key = base + "-" + n;
            if (!taken.contains(key)) {
                return key;
            }
        }
    }

    // å/ä/ö lose their accents; nothing left → fallback
    private static String slugify(String title, String fallback) {
        String slug = Normalizer.normalize(title, Normalizer.Form.NFD)
                .replaceAll("[\\u0300-\\u036f]", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        slug = slug.substring(0, Math.min(slug.length(), KEY_BASE_LENGTH)).replaceAll("-+$", "");
        return slug.isEmpty() ? fallback : slug;
    }
}
