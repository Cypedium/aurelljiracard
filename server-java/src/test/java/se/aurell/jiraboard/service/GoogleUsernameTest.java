package se.aurell.jiraboard.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GoogleUsernameTest {

    @Test
    void usesThePartBeforeTheAt() {
        assertThat(AuthService.googleUsernameBase("mikael.aurell@gmail.com")).isEqualTo("mikael.aurell");
    }

    @Test
    void cutsLongNamesToTheUsernameLimit() {
        assertThat(AuthService.googleUsernameBase("a".repeat(40) + "@gmail.com")).hasSize(32);
    }

    @Test
    void fallsBackToUserForEmptyOrRudeNames() {
        assertThat(AuthService.googleUsernameBase("@gmail.com")).isEqualTo("user");
        assertThat(AuthService.googleUsernameBase("shit.head@gmail.com")).isEqualTo("user");
    }
}
