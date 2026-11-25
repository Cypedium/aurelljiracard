package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.GoogleCredentialRequest;
import se.aurell.jiraboard.dto.LoginRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.RefreshTokenRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.TokenResponse;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.security.ReadOnlyExempt;
import se.aurell.jiraboard.security.RequiresFeature;
import se.aurell.jiraboard.service.AuthService;

/**
 * Public routes; every other controller requires a valid access token.
 * {@code @ReadOnlyExempt}: still works in read-only mode, so users can log in and out.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Creates the user and their own board. Field rules in RegisterRequest (400); password byte length, rude
     * names, repeated characters and the picture are checked in AuthService (400). 409 when the name is
     * taken in any casing.
     */
    @RequiresFeature(Feature.REGISTER)
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new MessageResponse("User registered successfully.");
    }

    /**
     * Username in any casing. 401 "Invalid credentials." for a wrong name or password, and for users created
     * by Google sign-in (no password). Starts a new refresh token family.
     */
    @ReadOnlyExempt
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Sign in with Google; creates the user on first sign-in (AuthService checks registration and read-only mode then)
    @ReadOnlyExempt
    @PostMapping("/google")
    public TokenResponse google(@Valid @RequestBody GoogleCredentialRequest request) {
        return authService.googleLogin(request.credential());
    }

    /** Revokes all the user's refresh tokens (every device). Always 200, also without a token or with a bad one. */
    @ReadOnlyExempt
    @PostMapping("/logout")
    public MessageResponse logout(@RequestBody(required = false) RefreshTokenRequest request) {
        authService.logout(request == null ? null : request.refreshToken());
        return new MessageResponse("Logged out successfully.");
    }

    /**
     * Trades a refresh token for a new pair; each refresh token works once. 401 without a token, 403 for an
     * invalid, revoked or reused one (a reused token also revokes that login).
     */
    @ReadOnlyExempt
    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody(required = false) RefreshTokenRequest request) {
        return authService.refresh(request == null ? null : request.refreshToken());
    }
}
