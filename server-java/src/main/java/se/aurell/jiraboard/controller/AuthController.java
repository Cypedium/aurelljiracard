package se.aurell.jiraboard.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import se.aurell.jiraboard.dto.ForgotPasswordRequest;
import se.aurell.jiraboard.dto.GoogleCredentialRequest;
import se.aurell.jiraboard.dto.LoginRequest;
import se.aurell.jiraboard.dto.MessageResponse;
import se.aurell.jiraboard.dto.RefreshTokenRequest;
import se.aurell.jiraboard.dto.RegisterRequest;
import se.aurell.jiraboard.dto.ResetPasswordRequest;
import se.aurell.jiraboard.dto.TokenResponse;
import se.aurell.jiraboard.dto.VerificationEmailRequest;
import se.aurell.jiraboard.dto.VerifyEmailRequest;
import se.aurell.jiraboard.entity.Feature;
import se.aurell.jiraboard.security.RateLimit;
import se.aurell.jiraboard.security.RateLimited;
import se.aurell.jiraboard.security.ReadOnlyExempt;
import se.aurell.jiraboard.security.RequiresFeature;
import se.aurell.jiraboard.service.AuthService;
import se.aurell.jiraboard.service.EmailVerificationService;
import se.aurell.jiraboard.service.PasswordResetService;

/**
 * Public routes; every other controller requires a valid access token.
 * {@code @ReadOnlyExempt}: still works in read-only mode, so users can log in and out.
 * {@code @RateLimited}: per client IP (429 with Retry-After); login and verification-email also count failed
 * passwords per account (LoginAttempts).
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
    }

    /**
     * Creates the user and their own board, and emails a verification link. Field rules in RegisterRequest
     * (400); password byte length, rude names, repeated characters and the language are checked in AuthService
     * (400). 409 when the name is taken in any casing or the email is another account's verified address.
     * 503 when the email can't be sent (nothing is saved then).
     */
    @RequiresFeature(Feature.REGISTER)
    @RateLimited(RateLimit.REGISTER)
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return new MessageResponse("Account created. Check your email to verify your address.");
    }

    /**
     * Username in any casing, or the email address. 401 "Invalid credentials." for a wrong name or password,
     * and for users created by Google sign-in (no password). 403 "Please add your email address." /
     * "Please verify your email address." until the email is verified. Starts a new refresh token family.
     */
    @ReadOnlyExempt
    @RateLimited(RateLimit.LOGIN)
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * For a user whose email isn't verified: checks the password and emails a new link, optionally to a new
     * address (required for older accounts without one). 401 wrong credentials, 409 already verified or the
     * address is another account's, 429 a link was sent less than a minute ago, 503 the email can't be sent.
     * Works in read-only mode, so older accounts can still get in.
     */
    @ReadOnlyExempt
    @RateLimited(RateLimit.EMAIL)
    @PostMapping("/verification-email")
    public MessageResponse verificationEmail(@Valid @RequestBody VerificationEmailRequest request) {
        authService.sendVerificationEmail(request);
        return new MessageResponse("Verification email sent.");
    }

    /** The token from the emailed link. 400 unknown, used or expired link; 409 another account verified the address. */
    @ReadOnlyExempt
    @RateLimited(RateLimit.LINK)
    @PostMapping("/verify-email")
    public MessageResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return new MessageResponse("Email verified. You can log in now.");
    }

    /**
     * Emails a password reset link (1 hour, works once) if a password account has verified this address.
     * Always the same 200, so it doesn't reveal who has an account; 400 invalid address, 503 email not configured.
     * Works in read-only mode, like login.
     */
    @ReadOnlyExempt
    @RateLimited(RateLimit.EMAIL)
    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.sendLink(request.email(), request.language());
        return new MessageResponse("If an account has this email address, we have sent it a link to reset the password.");
    }

    /**
     * The token from the emailed link and the new password. Logs the user out on every device.
     * 400 unknown, used or expired link, or a password that breaks the rules (same as register).
     */
    @ReadOnlyExempt
    @RateLimited(RateLimit.LINK)
    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.reset(request.token(), request.password());
        return new MessageResponse("Your password has been changed. You can log in now.");
    }

    // Sign in with Google; creates the user on first sign-in (AuthService checks registration and read-only mode then)
    @ReadOnlyExempt
    @RateLimited(RateLimit.SESSION)
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
    @RateLimited(RateLimit.SESSION)
    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody(required = false) RefreshTokenRequest request) {
        return authService.refresh(request == null ? null : request.refreshToken());
    }
}
