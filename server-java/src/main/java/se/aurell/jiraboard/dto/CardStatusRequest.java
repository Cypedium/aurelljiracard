package se.aurell.jiraboard.dto;

/** A column key or "backlog"; checked by ColumnService.requireCardStatus, whose message lists the valid ones. */
public record CardStatusRequest(String status) {
}
