import type { MojoContext } from '@mojojs/core';

import { RecoveryHub } from '../models/recoveryHub.js';

function intParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textParam(value: string | null, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

async function currentUserId(ctx: MojoContext): Promise<number> {
  const session = await ctx.session();
  return Number(session.userId);
}

function renderData(active: string, title: string, userId: number, extra: Record<string, unknown> = {}) {
  return { active, title, currentUserId: userId, ...extra };
}

export default class Controller {
  private hub(ctx: MojoContext): RecoveryHub {
    return ctx.models.recoveryHub as RecoveryHub;
  }

  async home(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const context = hub.currentContext(userId);
    const logMatch = hub.sameContextWhere(context, 'rl');
    const threadMatch = hub.sameContextWhere(context, 'dt');

    await ctx.render({ view: 'home', layout: 'default' }, renderData('home', 'Hub Home', userId, {
      context,
      latestPain: hub.latestPainState(userId),
      recommendedLogs: hub.logCards(`${logMatch.where} AND rl.user_id != ?`, [...logMatch.params, userId]),
      recommendedThreads: hub.threadCards(threadMatch.where, threadMatch.params),
      saved: hub.savedItems(userId),
      sessionMessage: ctx.req.query.get('session') === '1',
      loggedMessage: ctx.req.query.get('logged') === '1',
    }));
  }

  async contextPage(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    await ctx.render({ view: 'context', layout: 'default' }, renderData('context', 'Recovery Context Setup', userId, {
      context: hub.currentContext(userId),
      options: hub.optionsData(),
      savedMessage: ctx.req.query.get('saved') === '1',
    }));
  }

  async contextAction(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const params = await ctx.params();

    this.hub(ctx).updateContext(userId, {
      bodyAreaId: intParam(params.get('body_area_id'), 1),
      recoveryStageId: intParam(params.get('recovery_stage_id'), 2),
      activityGoalId: intParam(params.get('activity_goal_id'), 1),
      experienceLevel: textParam(params.get('experience_level'), 'recreational'),
      currentLimitation: textParam(params.get('current_limitation')),
      personalizeRecommendations: params.get('personalize_recommendations') === 'on' ? 1 : 0,
      shareStageTags: params.get('share_stage_tags') === 'on' ? 1 : 0,
      allowOptionalTracking: params.get('allow_optional_tracking') === 'on' ? 1 : 0,
    });

    await ctx.redirectTo('/context?saved=1');
  }

  async stage(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const context = hub.currentContext(userId);
    const stageId = Number(context?.recovery_stage_id ?? 2);
    const bodyAreaId = Number(context?.body_area_id ?? 1);
    const goalId = Number(context?.activity_goal_id ?? 1);

    await ctx.render({ view: 'stage', layout: 'default' }, renderData('stage', 'Stage Dashboard', userId, {
      context,
      stage: hub.stageById(stageId),
      logs: hub.logCards('AND rl.recovery_stage_id = ? AND rl.body_area_id = ? AND rl.activity_goal_id = ?', [stageId, bodyAreaId, goalId]),
      threads: hub.threadCards('AND dt.recovery_stage_id = ? AND dt.body_area_id = ? AND (dt.activity_goal_id = ? OR dt.activity_goal_id IS NULL)', [stageId, bodyAreaId, goalId]),
      movementIdeas: [
        'Low-load testing with a clear stop signal',
        'Short walk / jog intervals with next-day symptom review',
        'Keep intensity low until pain response is predictable',
      ],
    }));
  }

  async logNew(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    await ctx.render({ view: 'log-new', layout: 'default' }, renderData('log', 'Structured Recovery Log', userId, {
      context: hub.currentContext(userId),
      options: hub.optionsData(),
    }));
  }

  async logsAction(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const params = await ctx.params({ notEmpty: true });
    const context = hub.currentContext(userId);

    const result = hub.createRecoveryLog(userId, {
      bodyAreaId: intParam(params.get('body_area_id'), Number(context?.body_area_id ?? 1)),
      recoveryStageId: intParam(params.get('recovery_stage_id'), Number(context?.recovery_stage_id ?? 2)),
      activityGoalId: intParam(params.get('activity_goal_id'), Number(context?.activity_goal_id ?? 1)),
      title: textParam(params.get('title'), 'Recovery check-in'),
      movementTried: textParam(params.get('movement_tried'), 'Short controlled movement'),
      symptomsAndLimits: textParam(params.get('symptoms_and_limits')),
      whatHelped: textParam(params.get('what_helped')),
      questionForCommunity: textParam(params.get('question_for_community')),
      painBefore: intParam(params.get('pain_before'), 0),
      painAfter: intParam(params.get('pain_after'), 0),
      confidenceLevel: textParam(params.get('confidence_level'), 'medium'),
      visibility: textParam(params.get('visibility'), 'members'),
      allowSimilarStageDiscovery: params.get('allow_similar_stage_discovery') === 'on' ? 1 : 0,
      askForReplies: params.get('ask_for_replies') === 'on' ? 1 : 0,
    });

    const tagId = intParam(params.get('tag_id'), 0);
    if (tagId > 0) hub.addLogTag(Number(result.lastInsertRowid), tagId);

    await ctx.redirectTo('/?logged=1');
  }

  async explore(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const query = ctx.req.query;
    const filters = {
      stageId: query.get('stageId') ?? '',
      bodyAreaId: query.get('bodyAreaId') ?? '',
      goalId: query.get('goalId') ?? '',
      tag: query.get('tag') ?? '',
      q: query.get('q') ?? '',
    };

    const results = hub.exploreData(filters, userId);

    if (ctx.req.get('HX-Request') === 'true') {
      await ctx.render({ view: 'partials/explore-results' }, results);
      return;
    }

    await ctx.render({ view: 'explore', layout: 'default' }, renderData('explore', 'Explore Community', userId, {
      filters,
      options: hub.optionsData(),
      ...results,
    }));
  }

  async detail(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const type = String(ctx.stash.type);
    const id = Number(ctx.stash.id);

    if (type === 'thread') {
      const thread = hub.detailThread(id);
      await ctx.render({ view: 'detail', layout: 'default' }, renderData('detail', String(thread?.title ?? 'Discussion Detail'), userId, {
        type,
        item: thread,
        replies: hub.discussionReplies(id),
        similar: hub.logCards('AND rl.recovery_stage_id = ? AND rl.body_area_id = ?', [
          Number(thread?.recovery_stage_id ?? 2),
          Number(thread?.body_area_id ?? 1),
        ]),
      }));
      return;
    }

    const log = hub.detailLog(id);
    await ctx.render({ view: 'detail', layout: 'default' }, renderData('detail', String(log?.title ?? 'Log Detail'), userId, {
      type: 'log',
      item: log,
      replies: [],
      similar: hub.threadCards('AND dt.recovery_stage_id = ? AND dt.body_area_id = ?', [
        Number(log?.recovery_stage_id ?? 2),
        Number(log?.body_area_id ?? 1),
      ]),
    }));
  }

  async replyAction(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);
    const params = await ctx.params({ notEmpty: true });
    const threadId = intParam(params.get('discussion_thread_id'), 1);
    const reply = textParam(params.get('reply_body'));

    if (reply) hub.addReply(threadId, userId, reply);

    if (ctx.req.get('HX-Request') === 'true') {
      await ctx.render({ view: 'partials/thread-replies' }, {
        replies: hub.discussionReplies(threadId),
        threadId,
        posted: Boolean(reply),
      });
      return;
    }

    await ctx.redirectTo(`/detail/thread/${threadId}`);
  }

  async saveAction(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const params = await ctx.params();
    const type = textParam(params.get('type'), 'thread');
    const id = intParam(params.get('id'), 1);

    this.hub(ctx).saveItem(userId, type, id);
    await ctx.redirectTo(`/detail/${type}/${id}`);
  }

  async reportAction(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const params = await ctx.params();
    const type = textParam(params.get('type'), 'thread');
    const id = intParam(params.get('id'), 1);
    const details = textParam(params.get('details'), 'Flagged during A2 demo.');

    this.hub(ctx).reportContent(userId, type, id, details);
    await ctx.redirectTo(`/detail/${type}/${id}`);
  }

  async account(ctx: MojoContext): Promise<void> {
    const userId = await currentUserId(ctx);
    const hub = this.hub(ctx);

    await ctx.render({ view: 'account', layout: 'default' }, renderData('account', 'My Account / Context Summary', userId, {
      context: hub.currentContext(userId),
      latestPain: hub.latestPainState(userId),
      saved: hub.savedItems(userId),
    }));
  }
}
