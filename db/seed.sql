PRAGMA foreign_keys = ON;

DELETE FROM content_reports;
DELETE FROM saved_items;
DELETE FROM discussion_replies;
DELETE FROM discussion_threads;
DELETE FROM recovery_log_tags;
DELETE FROM log_tags;
DELETE FROM recovery_logs;
DELETE FROM user_recovery_contexts;
DELETE FROM activity_goals;
DELETE FROM recovery_stages;
DELETE FROM body_areas;
DELETE FROM users;

INSERT INTO users (user_id, username, display_name, email, role, is_active, created_at, updated_at)
VALUES
  (1, 'fanxin', 'Fanxin', 'fanxin@example.com', 'member', 1, '2026-04-18 09:00:00', '2026-05-01 09:00:00'),
  (2, 'alex_r', 'Alex', 'alex@example.com', 'member', 1, '2026-04-18 09:05:00', '2026-05-01 09:05:00'),
  (3, 'mina_a', 'Mina', 'mina@example.com', 'member', 1, '2026-04-18 09:10:00', '2026-05-01 09:10:00'),
  (4, 'jordan_k', 'Jordan', 'jordan@example.com', 'member', 1, '2026-04-18 09:15:00', '2026-05-01 09:15:00'),
  (5, 'rae_h', 'Rae', 'rae@example.com', 'moderator', 1, '2026-04-18 09:20:00', '2026-05-01 09:20:00');

INSERT INTO body_areas (body_area_id, name, description)
VALUES
  (1, 'Knee', 'Knee strain, joint pain, or return-to-running recovery.'),
  (2, 'Ankle', 'Ankle sprain or stability recovery.'),
  (3, 'Hip', 'Hip mobility, strength, or load-management recovery.'),
  (4, 'Shoulder', 'Shoulder mobility and strength recovery.');

INSERT INTO recovery_stages (recovery_stage_id, stage_order, name, description, guidance, intensity_level)
VALUES
  (1, 1, 'Early Recovery', 'The user is cautious and focused on symptoms, rest, and basic movement.', 'Prioritise reassurance, stop signals, and low-load examples.', 'low'),
  (2, 2, 'Controlled Return', 'The user is testing low-intensity movement and monitoring pain response.', 'Prioritise similar-stage logs and structured reflections.', 'low'),
  (3, 3, 'Building Confidence', 'The user is increasing activity while watching for setbacks.', 'Prioritise gradual progression and confidence tracking.', 'medium'),
  (4, 4, 'Return to Activity', 'The user is returning to regular training or sport-specific movement.', 'Prioritise maintenance, pacing, and relapse prevention.', 'high');

INSERT INTO activity_goals (activity_goal_id, name, description)
VALUES
  (1, 'Return to running', 'Build back toward jogging or running without rushing recovery.'),
  (2, 'Return to gym training', 'Resume resistance training with appropriate load control.'),
  (3, 'Walk without pain', 'Improve daily movement confidence and reduce pain during walking.'),
  (4, 'Improve mobility', 'Regain comfortable range of motion and control.');

INSERT INTO user_recovery_contexts (
  context_id, user_id, body_area_id, recovery_stage_id, activity_goal_id,
  experience_level, current_limitation, personalize_recommendations,
  share_stage_tags, allow_optional_tracking, created_at, updated_at
)
VALUES
  (1, 1, 1, 2, 1, 'recreational', 'Mild stiffness after stairs, no swelling increase.', 1, 1, 0, '2026-04-25 10:00:00', '2026-05-01 09:00:00'),
  (2, 2, 1, 2, 1, 'recreational', 'Testing short walks and controlled step-downs.', 1, 1, 0, '2026-04-25 11:00:00', '2026-05-01 09:05:00'),
  (3, 3, 2, 1, 3, 'beginner', 'Stair pain appears after longer days.', 1, 1, 0, '2026-04-25 12:00:00', '2026-05-01 09:10:00'),
  (4, 4, 1, 3, 1, 'competitive', 'Confidence is improving, but speed work still feels uncertain.', 1, 1, 1, '2026-04-25 13:00:00', '2026-05-01 09:15:00'),
  (5, 5, 3, 2, 4, 'recreational', 'Hip stiffness after sitting for long periods.', 1, 1, 0, '2026-04-25 14:00:00', '2026-05-01 09:20:00');

INSERT INTO recovery_logs (
  recovery_log_id, user_id, body_area_id, recovery_stage_id, activity_goal_id,
  title, log_date, movement_tried, symptoms_and_limits, what_helped,
  question_for_community, pain_before, pain_after, confidence_level,
  visibility, allow_similar_stage_discovery, ask_for_replies, created_at, updated_at
)
VALUES
  (1, 1, 1, 2, 1, 'First easy jog after knee strain', '2026-05-01',
   'Ten minute easy jog with walking breaks.',
   'Slight stiffness during the final two minutes, no swelling after rest.',
   'Stopping early made the session feel safer.',
   'Is mild stiffness normal at this stage?', 2, 3, 'medium',
   'members', 1, 1, '2026-05-01 09:30:00', '2026-05-01 09:30:00'),
  (2, 2, 1, 2, 1, 'Day 18 short walk test', '2026-04-30',
   'Fifteen minute walk on flat ground.',
   'Less stiffness after rest compared with last week.',
   'Shorter stride helped me stay relaxed.',
   'How long did others stay at this walking stage?', 2, 2, 'medium',
   'members', 1, 1, '2026-04-30 16:00:00', '2026-04-30 16:00:00'),
  (3, 4, 1, 3, 1, 'Confidence returning slowly', '2026-04-29',
   'Two kilometre jog at very easy pace.',
   'No pain during the jog, but I felt cautious on downhill sections.',
   'Keeping the pace easy helped with confidence.',
   'When did others start adding hills again?', 1, 2, 'high',
   'members', 1, 1, '2026-04-29 18:00:00', '2026-04-29 18:00:00'),
  (4, 3, 2, 1, 3, 'Stairs still feel uncertain', '2026-04-30',
   'Short walk plus one flight of stairs.',
   'Pain increased after stairs and settled after rest.',
   'Reducing stair volume helped the next morning.',
   'Should I avoid stairs for a few days?', 3, 4, 'low',
   'members', 1, 1, '2026-04-30 12:00:00', '2026-04-30 12:00:00'),
  (5, 5, 3, 2, 4, 'Hip mobility check-in', '2026-04-28',
   'Gentle mobility routine and short walk.',
   'Stiffness reduced after warming up.',
   'Doing the routine earlier in the day helped.',
   'What mobility markers should I track?', 2, 2, 'medium',
   'members', 1, 1, '2026-04-28 08:45:00', '2026-04-28 08:45:00');

INSERT INTO log_tags (log_tag_id, name, description)
VALUES
  (1, 'low intensity', 'Low-load activity suitable for cautious recovery.'),
  (2, 'stage 2', 'Controlled return recovery stage.'),
  (3, 'return to running', 'Goal related to rebuilding running activity.'),
  (4, 'stairs', 'Content related to stairs or step-down movements.'),
  (5, 'confidence', 'Content focused on confidence or reassurance.');

INSERT INTO recovery_log_tags (recovery_log_tag_id, recovery_log_id, log_tag_id)
VALUES
  (1, 1, 1),
  (2, 1, 2),
  (3, 1, 3),
  (4, 2, 1),
  (5, 2, 2),
  (6, 3, 3),
  (7, 3, 5),
  (8, 4, 4),
  (9, 5, 1);

INSERT INTO discussion_threads (
  discussion_thread_id, author_user_id, body_area_id, recovery_stage_id, activity_goal_id,
  title, question_body, status, is_flagged, created_at, updated_at
)
VALUES
  (1, 3, 1, 2, 1, 'Pain after stairs during controlled return',
   'I am seeing pain after stairs even though walking feels fine. How did other people handle this without rushing?',
   'answered', 0, '2026-04-30 13:00:00', '2026-04-30 17:00:00'),
  (2, 2, 1, 2, 1, 'When should I stop a session?',
   'I am trying to understand the difference between normal stiffness and a signal to stop.',
   'open', 0, '2026-05-01 08:00:00', '2026-05-01 08:00:00'),
  (3, 4, 1, 3, 1, 'What counts as progress?',
   'My pace is still slow, but my confidence is improving. Does that count as progress?',
   'open', 0, '2026-04-29 19:00:00', '2026-04-29 19:00:00');

INSERT INTO discussion_replies (
  discussion_reply_id, discussion_thread_id, author_user_id, reply_body,
  is_experience_share, is_marked_helpful, created_at, updated_at
)
VALUES
  (1, 1, 1, 'I reduced stair volume for two days and watched whether swelling changed. Tracking the next morning helped me decide.', 1, 1, '2026-04-30 15:00:00', '2026-04-30 15:00:00'),
  (2, 1, 5, 'As a general community note, avoid treating replies as medical advice. If symptoms increase sharply, seek professional support.', 0, 1, '2026-04-30 16:00:00', '2026-04-30 16:00:00'),
  (3, 2, 4, 'I stop when pain changes my movement pattern, even if the number is not very high.', 1, 0, '2026-05-01 08:30:00', '2026-05-01 08:30:00'),
  (4, 3, 2, 'Confidence counted for me because it helped me stay consistent without forcing intensity.', 1, 0, '2026-04-29 20:00:00', '2026-04-29 20:00:00');

INSERT INTO saved_items (saved_item_id, user_id, recovery_log_id, discussion_thread_id, created_at)
VALUES
  (1, 1, 2, NULL, '2026-05-01 10:00:00'),
  (2, 1, NULL, 1, '2026-05-01 10:05:00'),
  (3, 2, 1, NULL, '2026-05-01 10:10:00');

INSERT INTO content_reports (
  content_report_id, reporter_user_id, recovery_log_id, discussion_thread_id,
  discussion_reply_id, reason, details, status, created_at, resolved_at
)
VALUES
  (1, 1, NULL, NULL, 2, 'medical_claim',
   'Moderator-style reply needs review if it becomes too directive.',
   'resolved', '2026-05-01 11:00:00', '2026-05-01 11:30:00');
