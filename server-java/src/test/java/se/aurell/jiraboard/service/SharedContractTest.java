package se.aurell.jiraboard.service;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.Annotation;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import se.aurell.jiraboard.dto.CardRequest;
import se.aurell.jiraboard.dto.ColumnRequest;
import se.aurell.jiraboard.dto.IssueTypeRequest;
import se.aurell.jiraboard.dto.LanguageRequest;
import se.aurell.jiraboard.dto.LayoutRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.VerificationEmailRequest;
import se.aurell.jiraboard.entity.CardStatus;
import se.aurell.jiraboard.entity.CardType;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.entity.Language;
import se.aurell.jiraboard.entity.Role;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Rules the frontend and this API must agree on, checked against shared/contract.json (the frontend checks
 * the same file in tests/unit/contract.test.ts). Limits are read from the request records' Bean Validation
 * annotations, so they are tested where they are enforced.
 */
class SharedContractTest {

    private static JsonNode contract;

    @BeforeAll
    static void readContract() {
        // Maven runs the tests in server-java/
        contract = new ObjectMapper().readTree(Path.of("..", "shared", "contract.json").toFile());
    }

    private static List<String> strings(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.asString()));
        return values;
    }

    private static <A extends Annotation> A annotation(Class<?> record, String component, Class<A> type) {
        try {
            A found = record.getDeclaredField(component).getAnnotation(type);
            assertThat(found).as("%s on %s.%s", type.getSimpleName(), record.getSimpleName(), component).isNotNull();
            return found;
        } catch (NoSuchFieldException e) {
            throw new AssertionError(record.getSimpleName() + " has no component " + component, e);
        }
    }

    private static int limit(String name) {
        return contract.get("limits").get(name).asInt();
    }

    @Test
    void languages() {
        assertThat(Arrays.stream(Language.values()).map(Language::getValue).toList())
                .isEqualTo(strings(contract.get("languages")));
        // The validation message lists the same values
        assertThat(LanguageRequest.MESSAGE).isEqualTo("Language must be one of: " + Language.ALLOWED + ".");
    }

    @Test
    void rolesBacklogAndDefaultLists() {
        assertThat(Arrays.stream(Role.values()).map(Role::getValue).toList()).isEqualTo(strings(contract.get("roles")));
        assertThat(CardStatus.BACKLOG).isEqualTo(contract.get("backlogStatus").asString());

        List<Map<String, String>> columns = new ArrayList<>();
        contract.get("defaultColumns").forEach(c -> columns.add(Map.of("key", c.get("key").asString(), "title", c.get("title").asString())));
        assertThat(CardStatus.DEFAULT_COLUMNS.stream().map(e -> Map.of("key", e.getKey(), "title", e.getValue())).toList())
                .isEqualTo(columns);
    }

    @Test
    void issueTypesAndIcons() {
        assertThat(CardType.DEFAULT).isEqualTo(contract.get("defaultIssueType").asString());
        List<CardType.Default> defaults = new ArrayList<>();
        contract.get("defaultIssueTypes").forEach(t -> defaults.add(new CardType.Default(
                t.get("key").asString(), t.get("label").asString(), t.get("color").asString(), t.get("icon").asString())));
        assertThat(CardType.DEFAULTS).isEqualTo(defaults);
        assertThat(CardType.ICONS).isEqualTo(strings(contract.get("issueTypeIcons")));
    }

    @Test
    void featureSwitchKeys() {
        JsonNode features = contract.get("features");
        List<String> enforced = Arrays.stream(Feature.values())
                .filter(f -> !f.isUiOnly() && f != Feature.WRITES).map(Feature::getApiKey).toList();
        List<String> uiOnly = Arrays.stream(Feature.values()).filter(Feature::isUiOnly).map(Feature::getApiKey).toList();

        assertThat(enforced).isEqualTo(strings(features.get("enforced")));
        assertThat(uiOnly).isEqualTo(strings(features.get("uiOnly")));
        assertThat(Feature.WRITES.getApiKey()).isEqualTo(features.get("readOnly").asString());
    }

    @Test
    void lengthAndCountLimits() {
        assertThat(annotation(RegisterRequest.class, "username", Size.class).max()).isEqualTo(limit("usernameMax"));
        assertThat(annotation(RegisterRequest.class, "email", Size.class).max()).isEqualTo(limit("emailMax"));
        assertThat(annotation(VerificationEmailRequest.class, "email", Size.class).max()).isEqualTo(limit("emailMax"));
        Size password = annotation(RegisterRequest.class, "password", Size.class);
        assertThat(password.min()).isEqualTo(limit("passwordMin"));
        assertThat(password.max()).isEqualTo(limit("passwordMax"));
        assertThat(annotation(CardRequest.class, "rating", Min.class).value()).isEqualTo(limit("ratingMin"));
        assertThat(annotation(CardRequest.class, "rating", Max.class).value()).isEqualTo(limit("ratingMax"));
        assertThat(annotation(CardRequest.class, "comment", Size.class).max()).isEqualTo(limit("summaryMax"));
        assertThat(annotation(CardRequest.class, "productId", Size.class).max()).isEqualTo(limit("issueKeyMax"));
        assertThat(annotation(ColumnRequest.class, "title", Size.class).max()).isEqualTo(limit("listTitleMax"));
        assertThat(annotation(IssueTypeRequest.class, "label", Size.class).max()).isEqualTo(limit("issueTypeLabelMax"));
        assertThat(IssueTypeService.MAX_ISSUE_TYPES).isEqualTo(limit("maxIssueTypes"));
    }

    @Test
    void rudeWordList() {
        assertThat(CredentialRules.RUDE_WORDS).isEqualTo(strings(contract.get("rudeWords")));
    }

    @Test
    void hexColourSamplesOnEveryColourField() {
        JsonNode samples = contract.get("samples").get("hexColor");
        List<String> patterns = List.of(
                annotation(ColumnRequest.class, "color", Pattern.class).regexp(),
                annotation(IssueTypeRequest.class, "color", Pattern.class).regexp(),
                annotation(LayoutRequest.HeaderRequest.class, "color", Pattern.class).regexp());
        for (String regexp : patterns) {
            strings(samples.get("valid")).forEach(c -> assertThat(c.matches(regexp)).as("%s matches %s", c, regexp).isTrue());
            strings(samples.get("invalid")).forEach(c -> assertThat(c.matches(regexp)).as("%s matches %s", c, regexp).isFalse());
        }
    }

    @Test
    void issueKeySamples() {
        JsonNode samples = contract.get("samples").get("issueKey");
        String regexp = annotation(CardRequest.class, "productId", Pattern.class).regexp();
        int max = annotation(CardRequest.class, "productId", Size.class).max();
        strings(samples.get("valid")).forEach(k -> assertThat(k.length() <= max && k.matches(regexp)).as(k).isTrue());
        strings(samples.get("invalid")).forEach(k -> assertThat(k.length() <= max && k.matches(regexp)).as(k).isFalse());
    }

    @Test
    void emailSamplesOnEveryEmailField() {
        JsonNode samples = contract.get("samples").get("email");
        List<String> patterns = List.of(
                annotation(RegisterRequest.class, "email", Pattern.class).regexp(),
                annotation(VerificationEmailRequest.class, "email", Pattern.class).regexp());
        for (String regexp : patterns) {
            strings(samples.get("valid")).forEach(e -> assertThat(e.matches(regexp)).as(e).isTrue());
            strings(samples.get("invalid")).forEach(e -> assertThat(e.matches(regexp)).as(e).isFalse());
        }
    }

    @Test
    void usernameAndPasswordSamples() {
        JsonNode samples = contract.get("samples");
        strings(samples.get("username").get("rude")).forEach(u -> assertThat(CredentialRules.isRudeUsername(u)).as(u).isTrue());
        strings(samples.get("username").get("clean")).forEach(u -> assertThat(CredentialRules.isRudeUsername(u)).as(u).isFalse());
        strings(samples.get("password").get("repetitive"))
                .forEach(p -> assertThat(CredentialRules.isRepetitivePassword(p)).as(p).isTrue());
        strings(samples.get("password").get("ok")).forEach(p -> assertThat(CredentialRules.isRepetitivePassword(p)).as(p).isFalse());
    }
}
