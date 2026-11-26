package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * V15__email_verification.sql on existing users: accounts with Google count as verified (the oldest one if two
 * share an address), password-only accounts must add an email. Runs in a separate schema of the test container.
 */
class EmailMigrationTest extends ApiIntegrationTest {

    private static final String SCHEMA = "v15_migration_test";

    @Autowired
    DataSource dataSource;

    @AfterEach
    void dropSchema() {
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    private void migrateTo(String target) {
        Flyway.configure().dataSource(dataSource).schemas(SCHEMA).target(target).load().migrate();
    }

    @Test
    void googleAccountsAreVerifiedAndOthersMustAddAnEmail() {
        migrateTo("14");
        JdbcTemplate db = new JdbcTemplate(dataSource);
        String s = SCHEMA + ".";
        db.update("INSERT INTO " + s + "users (id, username, password_hash, google_sub, email, layout, created_at, updated_at, role) VALUES "
                + "(gen_random_uuid(), 'alice', 'hash', NULL, NULL, '{}', now() - interval '4 day', now(), 'user'), "
                + "(gen_random_uuid(), 'bob', NULL, 'g-bob', 'bob@gmail.com', '{}', now() - interval '3 day', now(), 'user'), "
                + "(gen_random_uuid(), 'carol', 'hash', 'g-carol', 'Shared@gmail.com', '{}', now() - interval '2 day', now(), 'user'), "
                + "(gen_random_uuid(), 'dave', NULL, 'g-dave', 'shared@gmail.com', '{}', now() - interval '1 day', now(), 'user')");

        migrateTo("15");

        List<String> verified = db.queryForList(
                "SELECT username FROM " + s + "users WHERE email_verified_at IS NOT NULL ORDER BY username", String.class);
        // carol is older than dave, so she keeps the shared address
        assertThat(verified).containsExactly("bob", "carol");
        assertThat(db.queryForObject("SELECT count(*) FROM " + s + "email_verifications", Integer.class)).isZero();
    }
}
