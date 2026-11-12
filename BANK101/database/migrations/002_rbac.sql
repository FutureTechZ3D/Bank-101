-- 002_rbac.sql -- Identity & Access Management layer
-- Apply after 001_hardening.sql

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- 2. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Role to permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. User to role mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 5. Server-side sessions (for logout/revocation)
CREATE TABLE IF NOT EXISTS user_sessions (
    id                 SERIAL PRIMARY KEY,
    user_id            INT REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at         TIMESTAMP NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked            BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_user_sessions_hash ON user_sessions (refresh_token_hash);

-- 6. Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_password_resets_user ON password_resets (user_id);

-- 7. Seed the three built-in roles (one per statement for pg-mem compatibility)
INSERT INTO roles (name, description) VALUES ('admin', 'Full platform administration') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, description) VALUES ('pro_user', 'Paid subscriber with unlimited hints') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, description) VALUES ('free_user', 'Standard registered user') ON CONFLICT (name) DO NOTHING;

-- 8. Seed permissions (one per statement)
INSERT INTO permissions (name) VALUES ('admin.dashboard.read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.users.read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.users.manage') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.exams.create') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.exams.publish') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.questions.import') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('admin.analytics.read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('user.exams.attempt') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('user.results.read') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('user.profile.update') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name) VALUES ('user.hints.unlimited') ON CONFLICT (name) DO NOTHING;

-- 9. Role-permission assignments using hardcoded IDs from the seed above.
-- Roles: admin=1, pro_user=2, free_user=3
-- Permissions (in insert order):
--   1=admin.dashboard.read  2=admin.users.read    3=admin.users.manage
--   4=admin.exams.create    5=admin.exams.publish 6=admin.questions.import
--   7=admin.analytics.read  8=user.exams.attempt  9=user.results.read
--   10=user.profile.update  11=user.hints.unlimited

-- admin gets all 11
INSERT INTO role_permissions VALUES (1,1) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,2) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,3) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,4) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,5) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,6) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,7) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,8) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,9) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,10) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (1,11) ON CONFLICT DO NOTHING;

-- pro_user: 8=user.exams.attempt, 9=user.results.read, 10=user.profile.update, 11=user.hints.unlimited
INSERT INTO role_permissions VALUES (2,8) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (2,9) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (2,10) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (2,11) ON CONFLICT DO NOTHING;

-- free_user: 8=user.exams.attempt, 9=user.results.read, 10=user.profile.update
INSERT INTO role_permissions VALUES (3,8) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (3,9) ON CONFLICT DO NOTHING;
INSERT INTO role_permissions VALUES (3,10) ON CONFLICT DO NOTHING;

-- 10. Backfill existing users into user_roles based on account_type
INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u
  JOIN roles r ON r.name = CASE u.account_type
    WHEN 'Admin' THEN 'admin'
    WHEN 'Pro'   THEN 'pro_user'
    ELSE              'free_user'
  END
ON CONFLICT DO NOTHING;
