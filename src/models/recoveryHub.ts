import Database from 'better-sqlite3';

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export interface ExploreFilters {
  stageId: string;
  bodyAreaId: string;
  goalId: string;
  tag: string;
  q: string;
}

export interface RecoveryLogInput {
  bodyAreaId: number;
  recoveryStageId: number;
  activityGoalId: number;
  title: string;
  movementTried: string;
  symptomsAndLimits: string;
  whatHelped: string;
  questionForCommunity: string;
  painBefore: number;
  painAfter: number;
  confidenceLevel: string;
  visibility: string;
  allowSimilarStageDiscovery: number;
  askForReplies: number;
}

export class RecoveryHub {
  db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.db.pragma('foreign_keys = ON');
  }

  private all<T extends Row = Row>(sql: string, params: SqlValue[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  private get<T extends Row = Row>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  private run(sql: string, params: SqlValue[] = []) {
    return this.db.prepare(sql).run(...params);
  }

  private numberValue(value: SqlValue | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  currentContext(userId: number) {
    return this.get(`
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
      WHERE c.user_id = ?;
    `, [userId]);
  }

  createDefaultContext(userId: number) {
    this.run(`
      INSERT OR IGNORE INTO user_recovery_contexts (
        user_id, body_area_id, recovery_stage_id, activity_goal_id,
        experience_level, current_limitation, personalize_recommendations,
        share_stage_tags, allow_optional_tracking, created_at, updated_at
      )
      VALUES (?, 1, 2, 1, 'recreational', 'Set this after the first recovery check-in.', 1, 1, 0, datetime('now'), datetime('now'));
    `, [userId]);
  }

  latestPainState(userId: number) {
    return this.get(`
      SELECT recovery_log_id, title, pain_before, pain_after, confidence_level, log_date, created_at
      FROM recovery_logs
      WHERE user_id = ?
      ORDER BY log_date DESC, created_at DESC, recovery_log_id DESC
      LIMIT 1;
    `, [userId]);
  }

  optionsData() {
    return {
      bodyAreas: this.all('SELECT * FROM body_areas ORDER BY name;'),
      recoveryStages: this.all('SELECT * FROM recovery_stages ORDER BY stage_order;'),
      activityGoals: this.all('SELECT * FROM activity_goals ORDER BY name;'),
      tags: this.all('SELECT * FROM log_tags ORDER BY name;'),
    };
  }

  logCards(where = '', params: SqlValue[] = []) {
    return this.all(`
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
      LIMIT 12;
    `, params);
  }

  threadCards(where = '', params: SqlValue[] = []) {
    return this.all(`
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
      LIMIT 12;
    `, params);
  }

  savedItems(userId: number) {
    return this.all(`
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
      LIMIT 4;
    `, [userId]);
  }

  discussionReplies(threadId: number) {
    return this.all(`
      SELECT dr.*, u.display_name AS author
      FROM discussion_replies dr
      JOIN users u ON u.user_id = dr.author_user_id
      WHERE dr.discussion_thread_id = ?
      ORDER BY dr.created_at;
    `, [threadId]);
  }

  sameContextWhere(context: Row | undefined, prefix: string) {
    return {
      where: `AND ${prefix}.recovery_stage_id = ? AND ${prefix}.body_area_id = ? AND (${prefix}.activity_goal_id = ? OR ${prefix}.activity_goal_id IS NULL)`,
      params: [
        this.numberValue(context?.recovery_stage_id, 2),
        this.numberValue(context?.body_area_id, 1),
        this.numberValue(context?.activity_goal_id, 1),
      ],
    };
  }

  stageById(stageId: number) {
    return this.get('SELECT * FROM recovery_stages WHERE recovery_stage_id = ?;', [stageId]);
  }

  updateContext(userId: number, values: {
    bodyAreaId: number;
    recoveryStageId: number;
    activityGoalId: number;
    experienceLevel: string;
    currentLimitation: string;
    personalizeRecommendations: number;
    shareStageTags: number;
    allowOptionalTracking: number;
  }) {
    this.run(`
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
      WHERE user_id = ?;
    `, [
      values.bodyAreaId,
      values.recoveryStageId,
      values.activityGoalId,
      values.experienceLevel,
      values.currentLimitation,
      values.personalizeRecommendations,
      values.shareStageTags,
      values.allowOptionalTracking,
      userId,
    ]);
  }

  createRecoveryLog(userId: number, input: RecoveryLogInput) {
    return this.run(`
      INSERT INTO recovery_logs (
        user_id, body_area_id, recovery_stage_id, activity_goal_id,
        title, movement_tried, symptoms_and_limits, what_helped,
        question_for_community, pain_before, pain_after, confidence_level,
        visibility, allow_similar_stage_discovery, ask_for_replies, log_date,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'), datetime('now'));
    `, [
      userId,
      input.bodyAreaId,
      input.recoveryStageId,
      input.activityGoalId,
      input.title,
      input.movementTried,
      input.symptomsAndLimits,
      input.whatHelped,
      input.questionForCommunity,
      input.painBefore,
      input.painAfter,
      input.confidenceLevel,
      input.visibility,
      input.allowSimilarStageDiscovery,
      input.askForReplies,
    ]);
  }

  addLogTag(logId: number, tagId: number) {
    this.run('INSERT OR IGNORE INTO recovery_log_tags (recovery_log_id, log_tag_id) VALUES (?, ?);', [
      logId,
      tagId,
    ]);
  }

  exploreData(filters: ExploreFilters, currentUserId: number) {
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

    const similarPeople = this.all(`
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
      LIMIT 8;
    `, [
      currentUserId,
      ...(filters.stageId ? [Number(filters.stageId)] : []),
      ...(filters.bodyAreaId ? [Number(filters.bodyAreaId)] : []),
      ...(filters.goalId ? [Number(filters.goalId)] : []),
    ]);

    return {
      similarPeople,
      logs: this.logCards(logWhere.join('\n'), logParams),
      threads: this.threadCards(threadWhere.join('\n'), threadParams),
    };
  }

  detailThread(id: number) {
    return this.get(`
      SELECT dt.*, u.display_name AS author, ba.name AS body_area, rs.name AS recovery_stage, ag.name AS activity_goal
      FROM discussion_threads dt
      JOIN users u ON u.user_id = dt.author_user_id
      JOIN body_areas ba ON ba.body_area_id = dt.body_area_id
      JOIN recovery_stages rs ON rs.recovery_stage_id = dt.recovery_stage_id
      LEFT JOIN activity_goals ag ON ag.activity_goal_id = dt.activity_goal_id
      WHERE dt.discussion_thread_id = ?;
    `, [id]);
  }

  detailLog(id: number) {
    return this.get(`
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
      GROUP BY rl.recovery_log_id;
    `, [id]);
  }

  addReply(threadId: number, userId: number, reply: string) {
    this.run(`
      INSERT INTO discussion_replies (
        discussion_thread_id, author_user_id, reply_body, is_experience_share,
        is_marked_helpful, created_at, updated_at
      )
      VALUES (?, ?, ?, 1, 0, datetime('now'), datetime('now'));
    `, [threadId, userId, reply]);
  }

  saveItem(userId: number, type: string, id: number) {
    if (type === 'log') {
      this.run('INSERT OR IGNORE INTO saved_items (user_id, recovery_log_id, created_at) VALUES (?, ?, datetime(\'now\'));', [
        userId,
        id,
      ]);
      return;
    }

    this.run('INSERT OR IGNORE INTO saved_items (user_id, discussion_thread_id, created_at) VALUES (?, ?, datetime(\'now\'));', [
      userId,
      id,
    ]);
  }

  reportContent(userId: number, type: string, id: number, details: string) {
    this.run(`
      INSERT INTO content_reports (
        reporter_user_id, recovery_log_id, discussion_thread_id, discussion_reply_id,
        reason, details, status, created_at
      )
      VALUES (?, ?, ?, NULL, 'other', ?, 'open', datetime('now'));
    `, [userId, type === 'log' ? id : null, type === 'thread' ? id : null, details]);
  }
}
