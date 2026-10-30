-- "admin" may delete any card; must match server/utils/role.js. Set admins directly in the database
ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));
