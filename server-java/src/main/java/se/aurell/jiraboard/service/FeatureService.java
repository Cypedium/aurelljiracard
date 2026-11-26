package se.aurell.jiraboard.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.aurell.jiraboard.dto.FeatureStateResponse;
import se.aurell.jiraboard.dto.FeatureSwitchResponse;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.entity.FeatureSwitch;
import se.aurell.jiraboard.exception.ApiException;
import se.aurell.jiraboard.repository.FeatureSwitchRepository;
import se.aurell.jiraboard.repository.UserRepository;
import se.aurell.jiraboard.security.AuthUser;

/**
 * Feature switches and read-only mode (docs/feature-switches.md). Read from the database on every checked
 * request, never cached: a kill switch must work at once and on every Fly machine. Site admins are never
 * blocked; that is decided by the caller ({@code FeatureInterceptor}).
 */
@Service
public class FeatureService {

    public static final String DISABLED_MESSAGE = "This feature is temporarily disabled.";
    public static final String READ_ONLY_MESSAGE = "AurellTodo is in read-only mode.";

    private final FeatureSwitchRepository featureSwitchRepository;
    private final UserRepository userRepository;

    public FeatureService(FeatureSwitchRepository featureSwitchRepository, UserRepository userRepository) {
        this.featureSwitchRepository = featureSwitchRepository;
        this.userRepository = userRepository;
    }

    /** The features that are off, {@link Feature#WRITES} = read-only mode. Unknown keys in the table are ignored. */
    @Transactional(readOnly = true)
    public Set<Feature> disabled() {
        Set<Feature> disabled = EnumSet.noneOf(Feature.class);
        featureSwitchRepository.findDisabledKeys().forEach(key -> Feature.fromKey(key).ifPresent(disabled::add));
        return disabled;
    }

    /**
     * 503 if this is a write and read-only mode is on, or if {@code feature} (may be null) is off.
     * One query; only for callers that are not site admins.
     */
    @Transactional(readOnly = true)
    public void requireAllowed(boolean write, Feature feature) {
        Set<Feature> disabled = disabled();
        if (write && disabled.contains(Feature.WRITES)) {
            throw ApiException.serviceUnavailable(READ_ONLY_MESSAGE);
        }
        if (feature != null && disabled.contains(feature)) {
            throw ApiException.serviceUnavailable(DISABLED_MESSAGE);
        }
    }

    /** Creating a user (register, a first Google sign-in): needs registration on and no read-only mode. */
    public void requireUserCreationAllowed() {
        requireAllowed(true, Feature.REGISTER);
    }

    /** GET /feature; site admins also get every switch with who changed it last. */
    @Transactional(readOnly = true)
    public FeatureStateResponse state(AuthUser viewer) {
        List<FeatureSwitch> rows = featureSwitchRepository.findAll();
        Set<Feature> disabled = EnumSet.noneOf(Feature.class);
        rows.stream().filter(FeatureSwitch::isDisabled)
                .forEach(row -> Feature.fromKey(row.getKey()).ifPresent(disabled::add));
        List<String> disabledKeys = Arrays.stream(Feature.values())
                .filter(f -> f != Feature.WRITES && disabled.contains(f))
                .map(Feature::getApiKey)
                .toList();
        List<FeatureSwitchResponse> switches = viewer != null && viewer.isAdmin() ? describe(rows) : null;
        return new FeatureStateResponse(disabled.contains(Feature.WRITES), disabledKeys, switches);
    }

    /** PUT /feature/{key} (site admins only, @AdminOnly on the controller). */
    @Transactional
    public FeatureSwitchResponse set(String apiKey, boolean enabled, AuthUser admin) {
        Feature feature = Feature.fromApiKey(apiKey).orElseThrow(() -> ApiException.notFound("Unknown feature."));
        FeatureSwitch row = featureSwitchRepository.findById(feature.getKey())
                .orElseGet(() -> new FeatureSwitch(feature.getKey()));
        // "readOnly" enabled = writes disabled
        boolean disabled = feature == Feature.WRITES ? enabled : !enabled;
        row.change(disabled, admin.id(), Instant.now());
        featureSwitchRepository.save(row);
        return toResponse(feature, Optional.of(row), Map.of(admin.id(), admin.username()));
    }

    private List<FeatureSwitchResponse> describe(List<FeatureSwitch> rows) {
        Map<String, FeatureSwitch> byKey = rows.stream().collect(Collectors.toMap(FeatureSwitch::getKey, Function.identity()));
        Set<UUID> adminIds = rows.stream().map(FeatureSwitch::getUpdatedBy).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> names = new HashMap<>();
        userRepository.findAllById(adminIds).forEach(u -> names.put(u.getId(), u.getUsername()));
        return Arrays.stream(Feature.values())
                .map(f -> toResponse(f, Optional.ofNullable(byKey.get(f.getKey())), names))
                .toList();
    }

    private static FeatureSwitchResponse toResponse(Feature feature, Optional<FeatureSwitch> row, Map<UUID, String> names) {
        boolean disabled = row.map(FeatureSwitch::isDisabled).orElse(false);
        boolean enabled = feature == Feature.WRITES ? disabled : !disabled;
        return new FeatureSwitchResponse(
                feature.getApiKey(),
                enabled,
                feature.isUiOnly(),
                row.map(FeatureSwitch::getUpdatedAt).orElse(null),
                row.map(FeatureSwitch::getUpdatedBy).map(names::get).orElse(null));
    }
}
