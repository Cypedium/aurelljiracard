package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;
import static java.util.Map.entry;

import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.security.FeatureInterceptor;
import se.aurell.jiraboard.security.RequiresFeature;

/**
 * Pins which endpoints carry @RequiresFeature and which writes are exempt from read-only mode, so a new
 * endpoint can't silently miss a switch (like AdminOnlyApiTest for @AdminOnly). Update both maps on purpose.
 */
class FeatureCoverageTest extends ApiIntegrationTest {

    private static final Map<String, Feature> FEATURES = Map.ofEntries(
            entry("POST /auth/register", Feature.REGISTER),
            entry("POST /board/{boardId}/card", Feature.CREATE_CARD),
            entry("PUT /board/{boardId}/card/{id}", Feature.EDIT_CARD),
            entry("PATCH /board/{boardId}/card/{id}/status", Feature.EDIT_CARD),
            entry("DELETE /board/{boardId}/card/{id}", Feature.DELETE_CARD),
            entry("POST /board/{boardId}/column", Feature.CREATE_COLUMN),
            entry("PUT /board/{boardId}/column", Feature.EDIT_COLUMNS),
            entry("PUT /board/{boardId}/column/{key}", Feature.EDIT_COLUMNS),
            entry("DELETE /board/{boardId}/column/{key}", Feature.DELETE_COLUMN),
            entry("POST /board/{boardId}/issue-type", Feature.MANAGE_ISSUE_TYPES),
            entry("DELETE /board/{boardId}/issue-type/{key}", Feature.MANAGE_ISSUE_TYPES),
            entry("POST /board/{boardId}/invite", Feature.SHARE_BOARD),
            entry("DELETE /board/{boardId}/invite", Feature.SHARE_BOARD),
            entry("DELETE /board/{boardId}/member/{userId}", Feature.SHARE_BOARD),
            entry("POST /invite/{token}", Feature.JOIN_BOARD),
            entry("POST /user/google", Feature.GOOGLE_CONNECT));

    // Writes that work in read-only mode: @ReadOnlyExempt, and @AdminOnly (admins are exempt anyway)
    private static final Set<String> READ_ONLY_EXEMPT = Set.of(
            "POST /auth/login", "POST /auth/refresh", "POST /auth/logout", "POST /auth/google",
            "POST /auth/verification-email", "POST /auth/verify-email",
            "PATCH /user/{id}", "DELETE /user/{id}", "POST /user/{id}/logout", "PUT /feature/{key}");

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping handlerMapping;

    @Test
    void featureAnnotationsAreExactlyTheListedOnes() {
        Map<String, Feature> found = new TreeMap<>();
        handlers().forEach((name, method) -> {
            RequiresFeature required = method.getMethodAnnotation(RequiresFeature.class);
            if (required != null) {
                found.put(name, required.value());
            }
        });
        assertThat(found).isEqualTo(new TreeMap<>(FEATURES));
    }

    @Test
    void readOnlyExemptWritesAreExactlyTheListedOnes() {
        Set<String> found = new TreeSet<>();
        handlers().forEach((name, method) -> {
            if (FeatureInterceptor.isReadOnlyExempt(method)) {
                found.add(name);
            }
        });
        assertThat(found).isEqualTo(new TreeSet<>(READ_ONLY_EXEMPT));
    }

    @Test
    void uiOnlySwitchesAreNeverEnforced() {
        assertThat(FEATURES.values()).noneMatch(Feature::isUiOnly).doesNotContain(Feature.WRITES);
    }

    /** "METHOD /path" → handler, for this app's controllers. */
    private Map<String, HandlerMethod> handlers() {
        Map<String, HandlerMethod> handlers = new TreeMap<>();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> e : handlerMapping.getHandlerMethods().entrySet()) {
            if (!e.getValue().getBeanType().getPackageName().startsWith("se.aurell.jiraboard")) {
                continue;
            }
            for (var method : e.getKey().getMethodsCondition().getMethods()) {
                for (String path : e.getKey().getPatternValues()) {
                    handlers.put(method.name() + " " + path, e.getValue());
                }
            }
        }
        return handlers;
    }
}
