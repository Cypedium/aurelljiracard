package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.FeatureStateResponse;
import se.aurell.jiraboard.dto.FeatureSwitchResponse;
import se.aurell.jiraboard.dto.FeatureUpdateRequest;
import se.aurell.jiraboard.security.AdminOnly;
import se.aurell.jiraboard.security.AuthUser;
import se.aurell.jiraboard.service.FeatureService;

/** Feature switches (docs/feature-switches.md). GET is public: the register page needs it before login. */
@RestController
@RequestMapping("/feature")
public class FeatureController {

    private final FeatureService featureService;

    public FeatureController(FeatureService featureService) {
        this.featureService = featureService;
    }

    // user is null without a token
    @GetMapping
    public FeatureStateResponse get(@AuthenticationPrincipal AuthUser user) {
        return featureService.state(user);
    }

    @AdminOnly
    @PutMapping("/{key}")
    // key is checked against the Feature enum in FeatureService.set (404 "Unknown feature.")
    public FeatureSwitchResponse set(@PathVariable String key, @Valid @RequestBody FeatureUpdateRequest request,
            @AuthenticationPrincipal AuthUser user) {
        return featureService.set(key, request.enabled(), user);
    }
}
