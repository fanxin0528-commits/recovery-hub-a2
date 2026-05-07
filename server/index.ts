import express, { type Request, type Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'db', 'recovery_hub.db');
const currentUserId = 1;
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON');

const app = express();
app.use(express.json());

type Params = Array<string | number | null>;
type DbRow = Record<string, string | number | null>;

function all<T>(sql: string, params: Params = []) {
  return db.prepare(sql).all(...params) as T[];
}

function get<T>(sql: string, params: Params = []) {
  return db.prepare(sql).get(...params) as T | undefined;
}

function run(sql: string, params: Params = []) {
  return db.prepare(sql).run(...params);
}

function parseNullableInt(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requireInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function latestPainSql() {
  return `
    SELECT recovery_log_id, title, pain_before, pain_after, confidence_level, log_date, created_at
    FROM recovery_logs
    WHERE user_id = ?
    ORDER BY log_date DESC, created_at DESC, recovery_log_id DESC
    LIMIT 1
  `;
}

function currentContext() {
  return get<DbRow>(`
    SELECT
      c.*,
      u.display_name,
      ba.name AS body_area,
      rs.name AS recovery_stage,
      rs.guidance AS stage_guidance,
      rs.intensity_level,
      ag.name AS activity_goal
    FROM user_recovery_contexts c
    JOIN users u ON u.user_id = c.user_id
    JOIN body_areas ba ON ba.body_area_id = c.body_area_id
    JOIN recovery_stages rs ON rs.recovery_stage_id = c.recovery_stage_id
    JOIN activity_goals ag ON ag.activity_goal_id = c.activity_goal_id
    WHERE c.user_id = ?
  `, [currentUserId]);
}

function optionsPayload() {
  return {
    bodyAreas: all('SELECT * FROM body_areas ORDER BY name'),
    recoveryStages: all('SELECT * FROM recovery_stages ORDER BY stage_order'),
    activityGoals: all('SELECT * FROM activity_goals ORDER BY name'),
    tags: all('SELECT * FROM log_tags ORDER BY name'),
  };
}

function logCards(where = '', params: Params = []) {
  return all(`
    SELECT
      rl.recovery_log_id,
      rl.title,
      rl.movement_tried,
      rl.symptoms_and_limits,
      rl.pain_before,
      rl.pain_after,
      rl.confidence_level,
      rl.log_date,
      rl.created_at,
      u.display_name AS author,
      ba.name AS body_area,
      rs.name AS recovery_stage,
      ag.name AS activity_goal,
      group_concat(lt.name, ', ') AS tags
    FROM recovery_logs rl
    JOIN users u ON u.user_id = rl.user_id
    JOIN body_areas ba ON ba.body_area_id = rl.body_area_id
    JOIN recovery_stages rs ON rs.recovery_stage_id = rl.recovery_stage_id
    JOIN activity_goals ag ON ag.activity_goal_id = rl.activity_goal_id
    LEFT JOIN recovery_log_tags rlt ON rlt.recovery_log_id = rl.recovery_log_id
    LEFT JOIN log_tags lt ON lt.log_tag_id = rlt.log_tag_id
    WHERE rl.visibility IN ('members', 'public')
    ${where}
    GROUP BY rl.recovery_log_id
    ORDER BY rl.created_at DESC, rl.recovery_log_id DESC
    LIMIT 12
  `, params);
}

function threadCards(where = '', params: Params = []) {
  return all(`
    SELECT
      dt.discussion_thread_id,
      dt.title,
      dt.question_body,
      dt.status,
      dt.created_at,
      u.display_name AS author,
      ba.name AS body_area,
      rs.name AS recovery_stage,
      ag.name AS activity_goal
    FROM discussion_threads dt
    JOIN users u ON u.user_id = dt.author_user_id
    JOIN body_areas ba ON ba.body_area_id = dt.body_area_id
    JOIN recovery_stages rs ON rs.recovery_stage_id = dt.recovery_stage_id
    LEFT JOIN activity_goals ag ON ag.activity_goal_id = dt.activity_goal_id
    WHERE 1 = 1
    ${where}
    ORDER BY dt.created_at DESC, dt.discussion_thread_id DESC
    LIMIT 12
  `, params);
}

function handleError(response: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  response.status(500).json({ error: message });
}

app.get('/api/home', (_request, response) => {
  try {
    const context = currentContext();
    const latestPainState = get(latestPainSql(), [currentUserId]);
    const recommendedLogs = logCards(
      `AND rl.user_id != ?
       AND rl.recovery_stage_id = ?
       AND rl.body_area_id = ?
       AND rl.activity_goal_id = ?`,
      [
        currentUserId,
        Number(context?.recovery_stage_id ?? 2),
        Number(context?.body_area_id ?? 1),
        Number(context?.activity_goal_id ?? 1),
      ],
    );
    const recommendedThreads = threadCards(
      `AND dt.recovery_stage_id = ?
       AND dt.body_area_id = ?
       AND (dt.activity_goal_id = ? OR dt.activity_goal_id IS NULL)`,
      [
        Number(context?.recovery_stage_id ?? 2),
        Number(context?.body_area_id ?? 1),
        Number(context?.activity_goal_id ?? 1),
      ],
    );
    const savedItems = all(`
      SELECT
        si.saved_item_id,
        COALESCE(rl.title, dt.title) AS title,
        CASE WHEN si.recovery_log_id IS NOT NULL THEN 'log' ELSE 'thread' END AS type
      FROM saved_items si
      LEFT JOIN recovery_logs rl ON rl.recovery_log_id = si.recovery_log_id
      LEFT JOIN discussion_threads dt ON dt.discussion_thread_id = si.discussion_thread_id
      WHERE si.user_id = ?
      ORDER BY si.created_at DESC
      LIMIT 4
    `, [currentUserId]);

    response.json({
      currentUser: { userId: currentUserId, displayName: context?.display_name ?? 'Fanxin' },
      context,
      latestPainState,
      recommendedLogs,
      recommendedThreads,
      savedItems,
    });
  } catch (error) {
    handleError(response, error);
  }
});

app.get('/api/context', (_request, response) => {
  try {
    response.json({ context: currentContext(), options: optionsPayload() });
  } catch (error) {
    handleError(response, error);
  }
});

app.put('/api/context', (request, response) => {
  try {
    const body = request.body ?? {};
    run(`
      UPDATE user_recovery_contexts
      SET
        body_area_id = ?,
        recovery_stage_id = ?,
        activity_goal_id = ?,
        experience_level = ?,
        current_limitation = ?,
        personalize_recommendations = ?,
        share_stage_tags = ?,
        allow_optional_tracking = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `, [
      requireInt(body.body_area_id, 1),
      requireInt(body.recovery_stage_id, 2),
      requireInt(body.activity_goal_id, 1),
      String(body.experience_level ?? 'recreational'),
      String(body.current_limitation ?? ''),
      body.personalize_recommendations ? 1 : 0,
      body.share_stage_tags ? 1 : 0,
      body.allow_optional_tracking ? 1 : 0,
      currentUserId,
    ]);
    response.json({ context: currentContext() });
  } catch (error) {
    handleError(response, error);
  }
});

app.get('/api/stage-dashboard', (_request, response) => {
  try {
    const context = currentContext();
    const stageId = Number(context?.recovery_stage_id ?? 2);
    const bodyAreaId = Number(context?.body_area_id ?? 1);
    const goalId = Number(context?.activity_goal_id ?? 1);
    const stage = get('SELECT * FROM recovery_stages WHERE recovery_stage_id = ?', [stageId]);
    const logs = logCards(
      'AND rl.recovery_stage_id = ? AND rl.body_area_id = ? AND rl.activity_goal_id = ?',
      [stageId, bodyAreaId, goalId],
    );
    const discussions = threadCards(
      'AND dt.recovery_stage_id = ? AND dt.body_area_id = ? AND (dt.activity_goal_id = ? OR dt.activity_goal_id IS NULL)',
      [stageId, bodyAreaId, goalId],
    );
    response.json({
      context,
      stage,
      logs,
      discussions,
      movementIdeas: [
        'Low-load testing with a clear stop signal',
        'Short walk / jog intervals with next-day symptom review',
        'Keep intensity low until pain response is predictable',
      ],
    });
  } catch (error) {
    handleError(response, error);
  }
});

app.get('/api/explore', (request, response) => {
  try {
    const stageId = parseNullableInt(request.query.stageId);
    const bodyAreaId = parseNullableInt(request.query.bodyAreaId);
    const goalId = parseNullableInt(request.query.goalId);
    const tagId = parseNullableInt(request.query.tag);
    const searchText = typeof request.query.q === 'string' && request.query.q.trim()
      ? request.query.q.trim()
      : null;

    const logWhere: string[] = [];
    const logParams: Params = [];
    if (bodyAreaId) { logWhere.push('AND rl.body_area_id = ?'); logParams.push(bodyAreaId); }
    if (stageId) { logWhere.push('AND rl.recovery_stage_id = ?'); logParams.push(stageId); }
    if (goalId) { logWhere.push('AND rl.activity_goal_id = ?'); logParams.push(goalId); }
    if (tagId) {
      logWhere.push(`AND EXISTS (
        SELECT 1 FROM recovery_log_tags x
        WHERE x.recovery_log_id = rl.recovery_log_id
          AND x.log_tag_id = ?
      )`);
      logParams.push(tagId);
    }
    if (searchText) {
      logWhere.push(`AND (
        rl.title LIKE '%' || ? || '%'
        OR rl.movement_tried LIKE '%' || ? || '%'
        OR rl.symptoms_and_limits LIKE '%' || ? || '%'
      )`);
      logParams.push(searchText, searchText, searchText);
    }

    const threadWhere: string[] = [];
    const threadParams: Params = [];
    if (bodyAreaId) { threadWhere.push('AND dt.body_area_id = ?'); threadParams.push(bodyAreaId); }
    if (stageId) { threadWhere.push('AND dt.recovery_stage_id = ?'); threadParams.push(stageId); }
    if (goalId) { threadWhere.push('AND (dt.activity_goal_id = ? OR dt.activity_goal_id IS NULL)'); threadParams.push(goalId); }
    if (searchText) {
      threadWhere.push(`AND (
        dt.title LIKE '%' || ? || '%'
        OR dt.question_body LIKE '%' || ? || '%'
      )`);
      threadParams.push(searchText, searchText);
    }

    const peopleWhere: string[] = ['AND u.user_id != ?'];
    const peopleParams: Params = [currentUserId];
    if (bodyAreaId) { peopleWhere.push('AND c.body_area_id = ?'); peopleParams.push(bodyAreaId); }
    if (stageId) { peopleWhere.push('AND c.recovery_stage_id = ?'); peopleParams.push(stageId); }
    if (goalId) { peopleWhere.push('AND c.activity_goal_id = ?'); peopleParams.push(goalId); }
    const similarPeople = all(`
      SELECT
        u.user_id,
        u.display_name,
        ba.name AS body_area,
        rs.name AS recovery_stage,
        ag.name AS activity_goal,
        c.current_limitation
      FROM user_recovery_contexts c
      JOIN users u ON u.user_id = c.user_id
      JOIN body_areas ba ON ba.body_area_id = c.body_area_id
      JOIN recovery_stages rs ON rs.recovery_stage_id = c.recovery_stage_id
      JOIN activity_goals ag ON ag.activity_goal_id = c.activity_goal_id
      WHERE u.is_active = 1
      ${peopleWhere.join('\n')}
      ORDER BY u.display_name
      LIMIT 8
    `, peopleParams);

    response.json({
      options: optionsPayload(),
      similarPeople,
      logs: logCards(logWhere.join('\n'), logParams),
      discussions: threadCards(threadWhere.join('\n'), threadParams),
      note: 'Tag filtering applies to recovery logs; discussion threads do not have tag tables in the current schema.',
    });
  } catch (error) {
    handleError(response, error);
  }
});

app.get('/api/detail/:type/:id', (request, response) => {
  try {
    const id = Number(request.params.id);
    if (request.params.type === 'log') {
      const item = get(`
        SELECT
          rl.*,
          u.display_name AS author,
          ba.name AS body_area,
          rs.name AS recovery_stage,
          ag.name AS activity_goal
        FROM recovery_logs rl
        JOIN users u ON u.user_id = rl.user_id
        JOIN body_areas ba ON ba.body_area_id = rl.body_area_id
        JOIN recovery_stages rs ON rs.recovery_stage_id = rl.recovery_stage_id
        JOIN activity_goals ag ON ag.activity_goal_id = rl.activity_goal_id
        WHERE rl.recovery_log_id = ?
      `, [id]);
      const tags = all(`
        SELECT lt.* FROM log_tags lt
        JOIN recovery_log_tags rlt ON rlt.log_tag_id = lt.log_tag_id
        WHERE rlt.recovery_log_id = ?
        ORDER BY lt.name
      `, [id]);
      response.json({ type: 'log', item, tags, replies: [] });
      return;
    }

    const item = get(`
      SELECT
        dt.*,
        u.display_name AS author,
        ba.name AS body_area,
        rs.name AS recovery_stage,
        ag.name AS activity_goal
      FROM discussion_threads dt
      JOIN users u ON u.user_id = dt.author_user_id
      JOIN body_areas ba ON ba.body_area_id = dt.body_area_id
      JOIN recovery_stages rs ON rs.recovery_stage_id = dt.recovery_stage_id
      LEFT JOIN activity_goals ag ON ag.activity_goal_id = dt.activity_goal_id
      WHERE dt.discussion_thread_id = ?
    `, [id]);
    const replies = all(`
      SELECT dr.*, u.display_name AS author
      FROM discussion_replies dr
      JOIN users u ON u.user_id = dr.author_user_id
      WHERE dr.discussion_thread_id = ?
      ORDER BY dr.created_at
    `, [id]);
    response.json({ type: 'thread', item, tags: [], replies });
  } catch (error) {
    handleError(response, error);
  }
});

app.post('/api/logs', (request, response) => {
  try {
    const body = request.body ?? {};
    db.exec('BEGIN');
    const result = run(`
      INSERT INTO recovery_logs (
        user_id, body_area_id, recovery_stage_id, activity_goal_id, title, log_date,
        movement_tried, symptoms_and_limits, what_helped, question_for_community,
        pain_before, pain_after, confidence_level, visibility,
        allow_similar_stage_discovery, ask_for_replies
      ) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      currentUserId,
      requireInt(body.body_area_id, 1),
      requireInt(body.recovery_stage_id, 2),
      requireInt(body.activity_goal_id, 1),
      String(body.title ?? 'Recovery log update'),
      String(body.movement_tried ?? ''),
      String(body.symptoms_and_limits ?? ''),
      String(body.what_helped ?? ''),
      String(body.question_for_community ?? ''),
      requireInt(body.pain_before, 0),
      requireInt(body.pain_after, 0),
      String(body.confidence_level ?? 'medium'),
      String(body.visibility ?? 'members'),
      body.allow_similar_stage_discovery === false ? 0 : 1,
      body.ask_for_replies === false ? 0 : 1,
    ]);
    const logId = Number(result.lastInsertRowid);
    const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids.map(Number).filter(Number.isFinite) : [];
    for (const tagId of tagIds) {
      run('INSERT OR IGNORE INTO recovery_log_tags (recovery_log_id, log_tag_id) VALUES (?, ?)', [logId, tagId]);
    }
    db.exec('COMMIT');
    response.status(201).json({ logId, latestPainState: get(latestPainSql(), [currentUserId]) });
  } catch (error) {
    db.exec('ROLLBACK');
    handleError(response, error);
  }
});

app.post('/api/discussion-replies', (request, response) => {
  try {
    const body = request.body ?? {};
    const result = run(`
      INSERT INTO discussion_replies (
        discussion_thread_id, author_user_id, reply_body, is_experience_share, is_marked_helpful
      ) VALUES (?, ?, ?, ?, 0)
    `, [
      requireInt(body.discussion_thread_id, 1),
      currentUserId,
      String(body.reply_body ?? ''),
      body.is_experience_share === false ? 0 : 1,
    ]);
    response.status(201).json({ replyId: Number(result.lastInsertRowid) });
  } catch (error) {
    handleError(response, error);
  }
});

app.post('/api/saved-items', (request, response) => {
  try {
    const body = request.body ?? {};
    const recoveryLogId = parseNullableInt(body.recovery_log_id);
    const discussionThreadId = parseNullableInt(body.discussion_thread_id);
    const result = run(`
      INSERT OR IGNORE INTO saved_items (user_id, recovery_log_id, discussion_thread_id)
      VALUES (?, ?, ?)
    `, [currentUserId, recoveryLogId, discussionThreadId]);
    response.status(201).json({ savedItemId: Number(result.lastInsertRowid) });
  } catch (error) {
    handleError(response, error);
  }
});

app.post('/api/content-reports', (request, response) => {
  try {
    const body = request.body ?? {};
    const result = run(`
      INSERT INTO content_reports (
        reporter_user_id, recovery_log_id, discussion_thread_id, discussion_reply_id, reason, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      currentUserId,
      parseNullableInt(body.recovery_log_id),
      parseNullableInt(body.discussion_thread_id),
      parseNullableInt(body.discussion_reply_id),
      String(body.reason ?? 'other'),
      String(body.details ?? ''),
    ]);
    response.status(201).json({ reportId: Number(result.lastInsertRowid) });
  } catch (error) {
    handleError(response, error);
  }
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get(/.*/, (_request: Request, response: Response) => {
  response.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT ?? 3101);
app.listen(port, () => {
  console.log(`Recovery Hub API running at http://localhost:${port}`);
});
