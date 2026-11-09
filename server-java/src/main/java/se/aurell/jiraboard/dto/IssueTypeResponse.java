package se.aurell.jiraboard.dto;

import se.aurell.jiraboard.entity.IssueType;

/** Same shape as the Express API: { key, label, color, icon, position }. */
public record IssueTypeResponse(String key, String label, String color, String icon, int position) {

    public static IssueTypeResponse from(IssueType type) {
        return new IssueTypeResponse(type.getTypeKey(), type.getLabel(), type.getColor(), type.getIcon(),
                type.getPosition());
    }
}
