PRAGMA foreign_keys = ON;

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'moderator', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE body_areas (
  body_area_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE recovery_stages (
  recovery_stage_id INTEGER PRIMARY KEY,
  stage_order INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  guidance TEXT,
  intensity_level TEXT NOT NULL
    CHECK (intensity_level IN ('low', 'medium', 'high'))
);

CREATE TABLE activity_goals (
  activity_goal_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE user_recovery_contexts (
  context_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  body_area_id INTEGER NOT NULL,
  recovery_stage_id INTEGER NOT NULL,
  activity_goal_id INTEGER NOT NULL,
  experience_level TEXT NOT NULL DEFAULT 'recreational'
    CHECK (experience_level IN ('beginner', 'recreational', 'competitive', 'unknown')),
  current_limitation TEXT,
  personalize_recommendations INTEGER NOT NULL DEFAULT 1
    CHECK (personalize_recommendations IN (0, 1)),
  share_stage_tags INTEGER NOT NULL DEFAULT 1
    CHECK (share_stage_tags IN (0, 1)),
  allow_optional_tracking INTEGER NOT NULL DEFAULT 0
    CHECK (allow_optional_tracking IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (body_area_id) REFERENCES body_areas(body_area_id),
  FOREIGN KEY (recovery_stage_id) REFERENCES recovery_stages(recovery_stage_id),
  FOREIGN KEY (activity_goal_id) REFERENCES activity_goals(activity_goal_id)
);

CREATE TABLE recovery_logs (
  recovery_log_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  body_area_id INTEGER NOT NULL,
  recovery_stage_id INTEGER NOT NULL,
  activity_goal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  log_date TEXT NOT NULL DEFAULT (date('now')),
  movement_tried TEXT NOT NULL,
  symptoms_and_limits TEXT,
  what_helped TEXT,
  question_for_community TEXT,
  pain_before INTEGER NOT NULL
    CHECK (pain_before BETWEEN 0 AND 10),
  pain_after INTEGER NOT NULL
    CHECK (pain_after BETWEEN 0 AND 10),
  confidence_level TEXT NOT NULL
    CHECK (confidence_level IN ('low', 'medium', 'high')),
  visibility TEXT NOT NULL DEFAULT 'members'
    CHECK (visibility IN ('private', 'members', 'public')),
  allow_similar_stage_discovery INTEGER NOT NULL DEFAULT 1
    CHECK (allow_similar_stage_discovery IN (0, 1)),
  ask_for_replies INTEGER NOT NULL DEFAULT 1
    CHECK (ask_for_replies IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (body_area_id) REFERENCES body_areas(body_area_id),
  FOREIGN KEY (recovery_stage_id) REFERENCES recovery_stages(recovery_stage_id),
  FOREIGN KEY (activity_goal_id) REFERENCES activity_goals(activity_goal_id)
);

CREATE TABLE log_tags (
  log_tag_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE recovery_log_tags (
  recovery_log_tag_id INTEGER PRIMARY KEY,
  recovery_log_id INTEGER NOT NULL,
  log_tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (recovery_log_id, log_tag_id),
  FOREIGN KEY (recovery_log_id) REFERENCES recovery_logs(recovery_log_id) ON DELETE CASCADE,
  FOREIGN KEY (log_tag_id) REFERENCES log_tags(log_tag_id) ON DELETE CASCADE
);

CREATE TABLE discussion_threads (
  discussion_thread_id INTEGER PRIMARY KEY,
  author_user_id INTEGER NOT NULL,
  body_area_id INTEGER NOT NULL,
  recovery_stage_id INTEGER NOT NULL,
  activity_goal_id INTEGER,
  title TEXT NOT NULL,
  question_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'answered', 'closed')),
  is_flagged INTEGER NOT NULL DEFAULT 0
    CHECK (is_flagged IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (body_area_id) REFERENCES body_areas(body_area_id),
  FOREIGN KEY (recovery_stage_id) REFERENCES recovery_stages(recovery_stage_id),
  FOREIGN KEY (activity_goal_id) REFERENCES activity_goals(activity_goal_id)
);

CREATE TABLE discussion_replies (
  discussion_reply_id INTEGER PRIMARY KEY,
  discussion_thread_id INTEGER NOT NULL,
  author_user_id INTEGER NOT NULL,
  reply_body TEXT NOT NULL,
  is_experience_share INTEGER NOT NULL DEFAULT 1
    CHECK (is_experience_share IN (0, 1)),
  is_marked_helpful INTEGER NOT NULL DEFAULT 0
    CHECK (is_marked_helpful IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discussion_thread_id) REFERENCES discussion_threads(discussion_thread_id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE saved_items (
  saved_item_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  recovery_log_id INTEGER,
  discussion_thread_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (recovery_log_id IS NOT NULL AND discussion_thread_id IS NULL)
    OR
    (recovery_log_id IS NULL AND discussion_thread_id IS NOT NULL)
  ),
  UNIQUE (user_id, recovery_log_id),
  UNIQUE (user_id, discussion_thread_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (recovery_log_id) REFERENCES recovery_logs(recovery_log_id) ON DELETE CASCADE,
  FOREIGN KEY (discussion_thread_id) REFERENCES discussion_threads(discussion_thread_id) ON DELETE CASCADE
);

CREATE TABLE content_reports (
  content_report_id INTEGER PRIMARY KEY,
  reporter_user_id INTEGER NOT NULL,
  recovery_log_id INTEGER,
  discussion_thread_id INTEGER,
  discussion_reply_id INTEGER,
  reason TEXT NOT NULL
    CHECK (reason IN ('unsafe_advice', 'medical_claim', 'harassment', 'spam', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  CHECK (
    (recovery_log_id IS NOT NULL)
    + (discussion_thread_id IS NOT NULL)
    + (discussion_reply_id IS NOT NULL) = 1
  ),
  FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (recovery_log_id) REFERENCES recovery_logs(recovery_log_id) ON DELETE CASCADE,
  FOREIGN KEY (discussion_thread_id) REFERENCES discussion_threads(discussion_thread_id) ON DELETE CASCADE,
  FOREIGN KEY (discussion_reply_id) REFERENCES discussion_replies(discussion_reply_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_context_stage ON user_recovery_contexts(recovery_stage_id);
CREATE INDEX idx_user_context_body_area ON user_recovery_contexts(body_area_id);
CREATE INDEX idx_user_context_goal ON user_recovery_contexts(activity_goal_id);

CREATE INDEX idx_recovery_logs_user_date ON recovery_logs(user_id, log_date);
CREATE INDEX idx_recovery_logs_stage_body_goal ON recovery_logs(recovery_stage_id, body_area_id, activity_goal_id);
CREATE INDEX idx_recovery_logs_visibility_created ON recovery_logs(visibility, created_at);

CREATE INDEX idx_recovery_log_tags_log ON recovery_log_tags(recovery_log_id);
CREATE INDEX idx_recovery_log_tags_tag ON recovery_log_tags(log_tag_id);

CREATE INDEX idx_discussion_threads_stage_body_goal ON discussion_threads(recovery_stage_id, body_area_id, activity_goal_id);
CREATE INDEX idx_discussion_threads_status_created ON discussion_threads(status, created_at);
CREATE INDEX idx_discussion_replies_thread_created ON discussion_replies(discussion_thread_id, created_at);

CREATE INDEX idx_saved_items_user ON saved_items(user_id);
CREATE INDEX idx_reports_status ON content_reports(status);
