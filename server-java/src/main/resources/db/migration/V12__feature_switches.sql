-- Feature switches and read-only mode (docs/feature-switches.md). The site admin turns features off
-- for everyone else (FeatureInterceptor answers 503); the row 'writes' disabled = read-only mode.
-- One row per Feature enum key, seeded on. A missing row reads as on.
CREATE TABLE feature_switches (
    feature_key VARCHAR(32) PRIMARY KEY,
    disabled    BOOLEAN     NOT NULL DEFAULT false,
    updated_at  TIMESTAMPTZ,
    updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

INSERT INTO feature_switches (feature_key) VALUES
    ('register'), ('createCard'), ('editCard'), ('deleteCard'), ('createColumn'), ('deleteColumn'),
    ('editColumns'), ('manageIssueTypes'), ('shareBoard'), ('joinBoard'), ('googleConnect'), ('writes'),
    ('backlogPage'), ('boardSwitcher'), ('issueTypesPage'), ('boardBackground'), ('navbarColour');
