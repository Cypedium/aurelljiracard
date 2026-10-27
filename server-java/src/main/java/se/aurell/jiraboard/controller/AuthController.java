package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.LoginRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.RefreshTokenRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.TokenResponse;
import se.aurell.jiraboard.service.AuthService;

/** Public routes; every other controller requires a valid access token. */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new MessageResponse("User registered successfully.");
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public MessageResponse logout(@RequestBody(required = false) RefreshTokenRequest request) {
        authService.logout(request == null ? null : request.refreshToken());
        return new MessageResponse("Logged out successfully.");
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody(required = false) RefreshTokenRequest request) {
        return authService.refresh(request == null ? null : request.refreshToken());
    }
}
