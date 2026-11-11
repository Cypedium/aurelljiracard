package se.aurell.jiraboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * V11__boards.sql on a database that already has users and cards: everything moves to the oldest
 * admin's board, the other users join it as collaborators and get their own seeded board.
 * Runs the migrations in a separate schema of the test container.
 */
class BoardMigrationTest extends ApiIntegrationTest {

    private static final String SCHEMA = "v11_migration_test";

    @Autowired
    DataSource dataSource;

    @AfterEach
    void dropSchema() {
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    private Flyway flyway(String target) {
        return Flyway.configure().dataSource(dataSource).schemas(SCHEMA).target(target).load();
    }

    @Test
    void existingDataMovesToTheAdminsBoard() {
        flyway("10").migrate();
        JdbcTemplate db = new JdbcTemplate(dataSource);
        String s = SCHEMA + ".";
        // alice is the oldest user, but boss is the oldest admin
        db.update("INSERT INTO " + s + "users (id, username, picture_url, layout, created_at, updated_at, role) VALUES "
                + "(gen_random_uuid(), 'alice', '', '{}', now() - interval '3 day', now(), 'user'), "
                + "(gen_random_uuid(), 'boss', '', '{}', now() - interval '2 day', now(), 'admin'), "
                + "(gen_random_uuid(), 'carol', '', '{}', now() - interval '1 day', now(), 'user')");
        db.update("INSERT INTO " + s + "board_columns (column_key, title, position) VALUES ('review', 'Review', 4)");
        db.update("INSERT INTO " + s + "cards (id, rating, comment, product_id, username, submitted_at, status, type) "
                + "VALUES (gen_random_uuid(), 3, 'x', 'AJB-1', 'alice', now(), 'review', 'bug')");

        flyway("11").migrate();

        Map<String, Object> mainBoard = db.queryForMap("SELECT b.id FROM " + s + "boards b JOIN " + s
                + "users u ON u.id = b.owner_id WHERE u.username = 'boss'");
        Object main = mainBoard.get("id");

        assertThat(db.queryForObject("SELECT count(*) FROM " + s + "boards", Integer.class)).isEqualTo(3);
        assertThat(db.queryForList("SELECT board_id FROM " + s + "cards", Object.class)).containsExactly(main);

        // boss is admin of his board; alice and carol are collaborators on it
        List<Map<String, Object>> members = db.queryForList("SELECT u.username, m.role FROM " + s + "board_members m JOIN "
                + s + "users u ON u.id = m.user_id WHERE m.board_id = ? ORDER BY u.username", main);
        assertThat(members).extracting(m -> m.get("username") + ":" + m.get("role"))
                .containsExactly("alice:user", "boss:admin", "carol:user");

        // The old shared lists (with "review") are boss's; the other boards get the defaults
        assertThat(db.queryForList("SELECT column_key FROM " + s + "board_columns WHERE board_id = ? ORDER BY position",
                String.class, main)).containsExactly("todo", "in-progress", "test", "done", "review");
        assertThat(db.queryForObject("SELECT count(*) FROM " + s + "board_columns", Integer.class)).isEqualTo(5 + 4 + 4);
        assertThat(db.queryForObject("SELECT count(*) FROM " + s + "issue_types", Integer.class)).isEqualTo(3 * 3);
        // Everyone is admin of their own board
        assertThat(db.queryForObject("SELECT count(*) FROM " + s + "board_members m JOIN " + s
                + "boards b ON b.id = m.board_id AND b.owner_id = m.user_id WHERE m.role = 'admin'", Integer.class))
                .isEqualTo(3);
    }

    @Test
    void anEmptyDatabaseMigrates() {
        flyway("11").migrate();
        JdbcTemplate db = new JdbcTemplate(dataSource);

        assertThat(db.queryForObject("SELECT count(*) FROM " + SCHEMA + ".board_columns", Integer.class)).isZero();
        assertThat(db.queryForObject("SELECT count(*) FROM " + SCHEMA + ".issue_types", Integer.class)).isZero();
    }
}
