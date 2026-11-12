-- 001_hardening.sql  (apply once, after schema.sql)
-- One answer row per (attempt, question): the API does check-then-insert, so without this two
-- parallel requests could create duplicate answers and inflate the score.
CREATE UNIQUE INDEX IF NOT EXISTS ux_attempt_answers_attempt_question ON attempt_answers (attempt_id, question_id);

-- Hint quota counts rows per (user, attempt).
CREATE INDEX IF NOT EXISTS ix_hint_usage_user_attempt ON hint_usage (user_id, quiz_attempt_id);

-- Leaderboard ordering.
CREATE INDEX IF NOT EXISTS ix_users_points ON users (points DESC);
