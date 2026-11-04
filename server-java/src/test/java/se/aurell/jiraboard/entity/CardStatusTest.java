package se.aurell.jiraboard.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class CardStatusTest {

    @Test
    void keyFromTitleMakesALowercaseKeyWithoutAccents() {
        assertThat(CardStatus.keyFromTitle("Klart för test!", List.of())).isEqualTo("klart-for-test");
        assertThat(CardStatus.keyFromTitle("  QA  ", List.of())).isEqualTo("qa");
        assertThat(CardStatus.keyFromTitle("???", List.of())).isEqualTo("list");
    }

    @Test
    void keyFromTitleNeverReturnsATakenKeyOrTheBacklog() {
        assertThat(CardStatus.keyFromTitle("Done", List.of("done", "done-2"))).isEqualTo("done-3");
        assertThat(CardStatus.keyFromTitle("Backlog", List.of())).isEqualTo("backlog-2");
    }

    @Test
    void keyFromTitleKeepsKeysShortAndValid() {
        String key = CardStatus.keyFromTitle("a very long list name that goes on and on", List.of());
        assertThat(key).hasSizeLessThanOrEqualTo(24);
        assertThat(CardStatus.isColumnKey(key)).isTrue();
    }

    @Test
    void isColumnKeyRejectsBacklogAndMalformedKeys() {
        assertThat(CardStatus.isColumnKey("in-progress")).isTrue();
        assertThat(CardStatus.isColumnKey("backlog")).isFalse();
        assertThat(CardStatus.isColumnKey("Not a key")).isFalse();
        assertThat(CardStatus.isColumnKey("a--b")).isFalse();
        assertThat(CardStatus.isColumnKey(null)).isFalse();
    }
}
