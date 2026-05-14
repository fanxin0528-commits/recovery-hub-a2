import mojo from '@mojojs/core';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(rootDir, 'db', 'recovery_hub.db');
const currentUserId = 1;

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export const app = mojo();

function all<T extends Row = Row>(sql: string, params: SqlValue[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

function get<T extends Row = Row>(sql: string, params: SqlValue[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

function run(sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).run(...params);
}

function intParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textParam(value: string | null, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function renderData(active: string, title: string, extra: Record<string, unknown> = {}) {
  return { active, title, currentUserId, ...extra };
}

function currentContext() {
  return get(`
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

function latestPainState() {
  return get(`
    SELECT recovery_log_id, title, pain_before, pain_after, confidence_level, log_date, created_at
    FROM recovery_logs
    WHERE user_id = ?
    ORDER BY log_date DESC, created_at DESC, recovery_log_id DESC
    LIMIT 1
  `, [currentUserId]);
}

function optionsData() {
  return {
    bodyAreas: all('SELECT * FROM body_areas ORDER BY name'),
    recoveryStages: all('SELECT * FROM recovery_stages ORDER BY stage_order'),
    activityGoals: all('SELECT * FROM activity_goals ORDER BY name'),
    tags: all('SELECT * FROM log_tags ORDER BY name'),
  };
}

function logCards(where = '', params: SqlValue[] = []) {
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

function threadCards(where = '', params: SqlValue[] = []) {
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

function savedItems() {
  return all(`
    SELECT
      si.saved_item_id,
      COALESCE(rl.title, dt.title) AS title,
      CASE WHEN si.recovery_log_id IS NOT NULL THEN 'log' ELSE 'thread' END AS item_type,
      COALESCE(rl.recovery_log_id, dt.discussion_thread_id) AS item_id
    FROM saved_items si
    LEFT JOIN recovery_logs rl ON rl.recovery_log_id = si.recovery_log_id
    LEFT JOIN discussion_threads dt ON dt.discussion_thread_id = si.discussion_thread_id
    WHERE si.user_id = ?
    ORDER BY si.created_at DESC
    LIMIT 4
  `, [currentUserId]);
}

function discussionReplies(threadId: number) {
  return all(`
    SELECT dr.*, u.display_name AS author
    FROM discussion_replies dr
    JOIN users u ON u.user_id = dr.author_user_id
    WHERE dr.discussion_thread_id = ?
    ORDER BY dr.created_at
  `, [threadId]);
}

function sameContextWhere(context: Row | undefined, prefix: string) {
  return {
    where: `AND ${prefix}.recovery_stage_id = ? AND ${prefix}.body_area_id = ? AND (${prefix}.activity_goal_id = ? OR ${prefix}.activity_goal_id IS NULL)`,
    params: [
      Number(context?.recovery_stage_id ?? 2),
      Number(context?.body_area_id ?? 1),
      Number(context?.activity_goal_id ?? 1),
    ],
  };
}

function exploreData(filters: Record<string, string>) {
  const logWhere: string[] = [];
  const logParams: SqlValue[] = [];
  const threadWhere: string[] = [];
  const threadParams: SqlValue[] = [];

  if (filters.stageId) {
    logWhere.push('AND rl.recovery_stage_id = ?');
    threadWhere.push('AND dt.recovery_stage_id = ?');
    logParams.push(Number(filters.stageId));
    threadParams.push(Number(filters.stageId));
  }
  if (filters.bodyAreaId) {
    logWhere.push('AND rl.body_area_id = ?');
    threadWhere.push('AND dt.body_area_id = ?');
    logParams.push(Number(filters.bodyAreaId));
    threadParams.push(Number(filters.bodyAreaId));
  }
  if (filters.goalId) {
    logWhere.push('AND rl.activity_goal_id = ?');
    threadWhere.push('AND dt.activity_goal_id = ?');
    logParams.push(Number(filters.goalId));
    threadParams.push(Number(filters.goalId));
  }
  if (filters.q) {
    logWhere.push('AND (rl.title LIKE ? OR rl.movement_tried LIKE ? OR rl.symptoms_and_limits LIKE ?)');
    threadWhere.push('AND (dt.title LIKE ? OR dt.question_body LIKE ?)');
    logParams.push(`%${filters.q}%`, `%${filters.q}%`, `%${filters.q}%`);
    threadParams.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.tag) {
    logWhere.push('AND lt.name = ?');
    logParams.push(filters.tag);
  }

  const similarPeople = all(`
    SELECT u.user_id, u.display_name, ba.name AS body_area, rs.name AS recovery_stage, ag.name AS activity_goal
    FROM user_recovery_contexts c
    JOIN users u ON u.user_id = c.user_id
    JOIN body_areas ba ON ba.body_area_id = c.body_area_id
    JOIN recovery_stages rs ON rs.recovery_stage_id = c.recovery_stage_id
    JOIN activity_goals ag ON ag.activity_goal_id = c.activity_goal_id
    WHERE u.user_id != ?
    ${filters.stageId ? 'AND c.recovery_stage_id = ?' : ''}
    ${filters.bodyAreaId ? 'AND c.body_area_id = ?' : ''}
    ${filters.goalId ? 'AND c.activity_goal_id = ?' : ''}
    LIMIT 8
  `, [
    currentUserId,
    ...(filters.stageId ? [Number(filters.stageId)] : []),
    ...(filters.bodyAreaId ? [Number(filters.bodyAreaId)] : []),
    ...(filters.goalId ? [Number(filters.goalId)] : []),
  ]);

  return {
    similarPeople,
    logs: logCards(logWhere.join('\n'), logParams),
    threads: threadCards(threadWhere.join('\n'), threadParams),
  };
}

app.get('/', async ctx => {
  const context = currentContext();
  const logMatch = sameContextWhere(context, 'rl');
  const threadMatch = sameContextWhere(context, 'dt');

  await ctx.render({ view: 'home', layout: 'default' }, renderData('home', 'Hub Home', {
    context,
    latestPain: latestPainState(),
    recommendedLogs: logCards(`${logMatch.where} AND rl.user_id != ?`, [...logMatch.params, currentUserId]),
    recommendedThreads: threadCards(threadMatch.where, threadMatch.params),
    saved: savedItems(),
  }));
});

app.get('/context', async ctx => {
  await ctx.render({ view: 'context', layout: 'default' }, renderData('context', 'Recovery Context Setup', {
    context: currentContext(),
    options: optionsData(),
    savedMessage: ctx.req.query.get('saved') === '1',
  }));
});

app.post('/context', async ctx => {
  const params = await ctx.params();
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
    intParam(params.get('body_area_id'), 1),
    intParam(params.get('recovery_stage_id'), 2),
    intParam(params.get('activity_goal_id'), 1),
    textParam(params.get('experience_level'), 'recreational'),
    textParam(params.get('current_limitation')),
    params.get('personalize_recommendations') === 'on' ? 1 : 0,
    params.get('share_stage_tags') === 'on' ? 1 : 0,
    params.get('allow_optional_tracking') === 'on' ? 1 : 0,
    currentUserId,
  ]);

  await ctx.redirectTo('/context?saved=1');
});

app.get('/stage', async ctx => {
  const context = currentContext();
  const stageId = Number(context?.recovery_stage_id ?? 2);
  const bodyAreaId = Number(context?.body_area_id ?? 1);
  const goalId = Number(context?.activity_goal_id ?? 1);

  await ctx.render({ view: 'stage', layout: 'default' }, renderData('stage', 'Stage Dashboard', {
    context,
    stage: get('SELECT * FROM recovery_stages WHERE recovery_stage_id = ?', [stageId]),
    logs: logCards('AND rl.recovery_stage_id = ? AND rl.body_area_id = ? AND rl.activity_goal_id = ?', [stageId, bodyAreaId, goalId]),
    threads: threadCards('AND dt.recovery_stage_id = ? AND dt.body_area_id = ? AND (dt.activity_goal_id = ? OR dt.activity_goal_id IS NULL)', [stageId, bodyAreaId, goalId]),
    movementIdeas: [
      'Low-load testing with a clear stop signal',
      'Short walk / jog intervals with next-day symptom review',
      'Keep intensity low until pain response is predictable',
    ],
  }));
});

app.get('/log/new', async ctx => {
  await ctx.render({ view: 'log-new', layout: 'default' }, renderData('log', 'Structured Recovery Log', {
    context: currentContext(),
    options: optionsData(),
  }));
});

app.post('/logs', async ctx => {
  const params = await ctx.params({ notEmpty: true });
  const context = currentContext();

  const result = run(`
    INSERT INTO recovery_logs (
      user_id, body_area_id, recovery_stage_id, activity_goal_id,
      title, movement_tried, symptoms_and_limits, what_helped,
      question_for_community, pain_before, pain_after, confidence_level,
      visibility, allow_similar_stage_discovery, ask_for_replies, log_date,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'), datetime('now'))
  `, [
    currentUserId,
    intParam(params.get('body_area_id'), Number(context?.body_area_id ?? 1)),
    intParam(params.get('recovery_stage_id'), Number(context?.recovery_stage_id ?? 2)),
    intParam(params.get('activity_goal_id'), Number(context?.activity_goal_id ?? 1)),
    textParam(params.get('title'), 'Recovery check-in'),
    textParam(params.get('movement_tried'), 'Short controlled movement'),
    textParam(params.get('symptoms_and_limits')),
    textParam(params.get('what_helped')),
    textParam(params.get('question_for_community')),
    intParam(params.get('pain_before'), 0),
    intParam(params.get('pain_after'), 0),
    textParam(params.get('confidence_level'), 'medium'),
    textParam(params.get('visibility'), 'members'),
    params.get('allow_similar_stage_discovery') === 'on' ? 1 : 0,
    params.get('ask_for_replies') === 'on' ? 1 : 0,
  ]);

  const tagId = intParam(params.get('tag_id'), 0);
  if (tagId > 0) {
    run('INSERT OR IGNORE INTO recovery_log_tags (recovery_log_id, log_tag_id) VALUES (?, ?)', [
      Number(result.lastInsertRowid),
      tagId,
    ]);
  }

  await ctx.redirectTo('/?logged=1');
});

app.get('/explore', async ctx => {
  const query = ctx.req.query;
  const filters = {
    stageId: query.get('stageId') ?? '',
    bodyAreaId: query.get('bodyAreaId') ?? '',
    goalId: query.get('goalId') ?? '',
    tag: query.get('tag') ?? '',
    q: query.get('q') ?? '',
  };

  const results = exploreData(filters);

  if (ctx.req.get('HX-Request') === 'true') {
    await ctx.render({ view: 'partials/explore-results' }, results);
    return;
  }

  await ctx.render({ view: 'explore', layout: 'default' }, renderData('explore', 'Explore Community', {
    filters,
    options: optionsData(),
    ...results,
  }));
});

app.get('/detail/:type/:id', async ctx => {
  const type = String(ctx.stash.type);
  const id = Number(ctx.stash.id);

  if (type === 'thread') {
    const thread = get(`
      SELECT dt.*, u.display_name AS author, ba.name AS body_area, rs.name AS recovery_stage, ag.name AS activity_goal
      FROM discussion_threads dt
      JOIN users u ON u.user_id = dt.author_user_id
      JOIN body_areas ba ON ba.body_area_id = dt.body_area_id
      JOIN recovery_stages rs ON rs.recovery_stage_id = dt.recovery_stage_id
      LEFT JOIN activity_goals ag ON ag.activity_goal_id = dt.activity_goal_id
      WHERE dt.discussion_thread_id = ?
    `, [id]);

    await ctx.render({ view: 'detail', layout: 'default' }, renderData('detail', String(thread?.title ?? 'Discussion Detail'), {
      type,
      item: thread,
      replies: discussionReplies(id),
      similar: logCards('AND rl.recovery_stage_id = ? AND rl.body_area_id = ?', [
        Number(thread?.recovery_stage_id ?? 2),
        Number(thread?.body_area_id ?? 1),
      ]),
    }));
    return;
  }

  const log = get(`
    SELECT rl.*, u.display_name AS author, ba.name AS body_area, rs.name AS recovery_stage, ag.name AS activity_goal,
      group_concat(lt.name, ', ') AS tags
    FROM recovery_logs rl
    JOIN users u ON u.user_id = rl.user_id
    JOIN body_areas ba ON ba.body_area_id = rl.body_area_id
    JOIN recovery_stages rs ON rs.recovery_stage_id = rl.recovery_stage_id
    JOIN activity_goals ag ON ag.activity_goal_id = rl.activity_goal_id
    LEFT JOIN recovery_log_tags rlt ON rlt.recovery_log_id = rl.recovery_log_id
    LEFT JOIN log_tags lt ON lt.log_tag_id = rlt.log_tag_id
    WHERE rl.recovery_log_id = ?
    GROUP BY rl.recovery_log_id
  `, [id]);

  await ctx.render({ view: 'detail', layout: 'default' }, renderData('detail', String(log?.title ?? 'Log Detail'), {
    type: 'log',
    item: log,
    replies: [],
    similar: threadCards('AND dt.recovery_stage_id = ? AND dt.body_area_id = ?', [
      Number(log?.recovery_stage_id ?? 2),
      Number(log?.body_area_id ?? 1),
    ]),
  }));
});

app.post('/discussion-replies', async ctx => {
  const params = await ctx.params({ notEmpty: true });
  const threadId = intParam(params.get('discussion_thread_id'), 1);
  const reply = textParam(params.get('reply_body'));

  if (reply) {
    run(`
      INSERT INTO discussion_replies (
        discussion_thread_id, author_user_id, reply_body, is_experience_share,
        is_marked_helpful, created_at, updated_at
      )
      VALUES (?, ?, ?, 1, 0, datetime('now'), datetime('now'))
    `, [threadId, currentUserId, reply]);
  }

  if (ctx.req.get('HX-Request') === 'true') {
    await ctx.render({ view: 'partials/thread-replies' }, {
      replies: discussionReplies(threadId),
      threadId,
      posted: Boolean(reply),
    });
    return;
  }

  await ctx.redirectTo(`/detail/thread/${threadId}`);
});

app.post('/saved-items', async ctx => {
  const params = await ctx.params();
  const type = textParam(params.get('type'), 'thread');
  const id = intParam(params.get('id'), 1);

  if (type === 'log') {
    run('INSERT OR IGNORE INTO saved_items (user_id, recovery_log_id, created_at) VALUES (?, ?, datetime(\'now\'))', [
      currentUserId,
      id,
    ]);
  } else {
    run('INSERT OR IGNORE INTO saved_items (user_id, discussion_thread_id, created_at) VALUES (?, ?, datetime(\'now\'))', [
      currentUserId,
      id,
    ]);
  }

  await ctx.redirectTo(`/detail/${type}/${id}`);
});

app.post('/content-reports', async ctx => {
  const params = await ctx.params();
  const type = textParam(params.get('type'), 'thread');
  const id = intParam(params.get('id'), 1);
  const details = textParam(params.get('details'), 'Flagged during A2 demo.');

  run(`
    INSERT INTO content_reports (
      reporter_user_id, recovery_log_id, discussion_thread_id, discussion_reply_id,
      reason, details, status, created_at
    )
    VALUES (?, ?, ?, NULL, 'other', ?, 'open', datetime('now'))
  `, [currentUserId, type === 'log' ? id : null, type === 'thread' ? id : null, details]);

  await ctx.redirectTo(`/detail/${type}/${id}`);
});

app.get('/account', async ctx => {
  await ctx.render({ view: 'account', layout: 'default' }, renderData('account', 'My Account / Context Summary', {
    context: currentContext(),
    latestPain: latestPainState(),
    saved: savedItems(),
  }));
});

app.start();
