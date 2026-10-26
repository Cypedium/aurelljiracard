package se.aurell.jiraboard.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import se.aurell.jiraboard.dto.MessageResponse;

/** Every error is returned as { message }; internal details never reach the client. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<MessageResponse> handleApi(ApiException e) {
        return respond(e.getStatus(), e.getMessage());
    }

    // Bean Validation on request bodies: return the first violation, like the Express API
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<MessageResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Invalid request body.");
        return respond(HttpStatus.BAD_REQUEST, message);
    }

    // Malformed JSON, wrong field types, or an unknown status/type value
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<MessageResponse> handleUnreadable(HttpMessageNotReadableException e) {
        if (NestedExceptionUtils.getMostSpecificCause(e) instanceof ApiException api) {
            return respond(api.getStatus(), api.getMessage());
        }
        return respond(HttpStatus.BAD_REQUEST, "Invalid request body.");
    }

    // The only path variable is a card id
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<MessageResponse> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return respond(HttpStatus.BAD_REQUEST, "Invalid card id.");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<MessageResponse> handleNotFound(NoResourceFoundException e) {
        return respond(HttpStatus.NOT_FOUND, "Not found.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<MessageResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed.");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<MessageResponse> handleMediaType(HttpMediaTypeNotSupportedException e) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Content-Type must be application/json.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<MessageResponse> handleUnexpected(Exception e) {
        // Only the exception type and message: never request bodies, tokens or connection strings
        log.error("Unhandled error: {}: {}", e.getClass().getName(), e.getMessage());
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }

    private static ResponseEntity<MessageResponse> respond(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new MessageResponse(message));
    }
}
