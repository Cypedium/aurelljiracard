-- Users and cards, ported from the Mongoose models in server/models

CREATE TABLE users (
    id             UUID         PRIMARY KEY,
    username       VARCHAR(32)  NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    -- base64 data URL (up to 1.5 MB) or http(s) URL
    picture_url    TEXT         NOT NULL,
    -- Incremented on logout to revoke all outstanding refresh tokens
    token_version  INTEGER      NOT NULL DEFAULT 0,
    -- Board layout { cols, headers[], cards[] }, embedded on the user like in MongoDB
    layout         JSONB        NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL
);

CREATE TABLE cards (
    id            UUID          PRIMARY KEY,
    rating        INTEGER       NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       VARCHAR(2000) NOT NULL,
    product_id    VARCHAR(200)  NOT NULL,
    username      VARCHAR(32)   NOT NULL REFERENCES users (username),
    submitted_at  TIMESTAMPTZ   NOT NULL,
    -- Must match server/utils/cardStatus.js and frontend/app/utils/boardLayout.ts
    status        VARCHAR(20)   NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in-progress', 'test', 'done')),
    -- Must match server/utils/cardType.js and frontend/app/utils/cardType.ts
    type          VARCHAR(10)   NOT NULL DEFAULT 'task'
                  CHECK (type IN ('task', 'bug', 'doc'))
);

-- GET /card lists newest first
CREATE INDEX cards_submitted_at_idx ON cards (submitted_at DESC);
