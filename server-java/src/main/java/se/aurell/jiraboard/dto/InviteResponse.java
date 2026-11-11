package se.aurell.jiraboard.dto;

/** A new invite link's token; only its hash is stored, so this is the only time it is shown. */
public record InviteResponse(String token) {
}
