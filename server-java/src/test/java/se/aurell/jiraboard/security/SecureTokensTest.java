package se.aurell.jiraboard.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SecureTokensTest {

    @Test
    void generatesUrlSafeTokensOfFixedLength() {
        String token = SecureTokens.generate();
        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void generatesDifferentTokens() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            tokens.add(SecureTokens.generate());
        }
        assertThat(tokens).hasSize(100);
    }

    @Test
    void hashesWithSha256AsLowercaseHex() {
        // The known SHA-256 of "abc", so hashes of links already in the database still match
        assertThat(SecureTokens.sha256Hex("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
