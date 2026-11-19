package se.aurell.jiraboard.entity;

import java.util.Arrays;
import java.util.Optional;

/**
 * A feature the site admin can switch off (docs/feature-switches.md, V12__feature_switches.sql). Keys must
 * match FEATURE_KEYS in frontend/app/utils/features.ts. {@link #WRITES} is read-only mode: disabled = every
 * write is refused; the API calls it "readOnly". UI-only switches only hide links in the frontend and are
 * never checked here (no handler may carry them, FeatureCoverageTest).
 */
public enum Feature {
    REGISTER("register"),
    CREATE_CARD("createCard"),
    EDIT_CARD("editCard"),
    DELETE_CARD("deleteCard"),
    CREATE_COLUMN("createColumn"),
    DELETE_COLUMN("deleteColumn"),
    EDIT_COLUMNS("editColumns"),
    MANAGE_ISSUE_TYPES("manageIssueTypes"),
    SHARE_BOARD("shareBoard"),
    JOIN_BOARD("joinBoard"),
    GOOGLE_CONNECT("googleConnect"),
    WRITES("writes"),
    BACKLOG_PAGE("backlogPage", true),
    BOARD_SWITCHER("boardSwitcher", true),
    ISSUE_TYPES_PAGE("issueTypesPage", true),
    BOARD_BACKGROUND("boardBackground", true),
    NAVBAR_COLOUR("navbarColour", true);

    public static final String READ_ONLY_KEY = "readOnly";

    private final String key;
    private final boolean uiOnly;

    Feature(String key) {
        this(key, false);
    }

    Feature(String key, boolean uiOnly) {
        this.key = key;
        this.uiOnly = uiOnly;
    }

    /** The database key (feature_switches.feature_key). */
    public String getKey() {
        return key;
    }

    /** The key in the API: the same as the database key, except "readOnly" for {@link #WRITES}. */
    public String getApiKey() {
        return this == WRITES ? READ_ONLY_KEY : key;
    }

    public boolean isUiOnly() {
        return uiOnly;
    }

    public static Optional<Feature> fromKey(String key) {
        return Arrays.stream(values()).filter(f -> f.key.equals(key)).findFirst();
    }

    public static Optional<Feature> fromApiKey(String apiKey) {
        return Arrays.stream(values()).filter(f -> f.getApiKey().equals(apiKey)).findFirst();
    }
}
