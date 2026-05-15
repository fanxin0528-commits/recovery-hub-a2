import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import t from 'tap';

import { RecoveryHub } from '../lib/models/recoveryHub.js';

function seededHub() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync('db/schema.sql', 'utf8'));
  db.exec(readFileSync('db/seed.sql', 'utf8'));
  return { db, hub: new RecoveryHub(db) };
}

t.test('home data reads recovery context and derives pain from logs', t => {
  const { db, hub } = seededHub();
  t.teardown(() => db.close());

  const context = hub.currentContext(1);
  const latestPain = hub.latestPainState(1);

  t.equal(context?.display_name, 'Fanxin');
  t.equal(context?.body_area, 'Knee');
  t.equal(latestPain?.title, 'First easy jog after knee strain');
  t.equal(latestPain?.pain_after, 3);
  t.notOk(Object.hasOwn(context ?? {}, 'pain_after'), 'context does not duplicate pain state');
  t.end();
});

t.test('explore finds similar members, logs, and discussions', t => {
  const { db, hub } = seededHub();
  t.teardown(() => db.close());

  const results = hub.exploreData({
    stageId: '2',
    bodyAreaId: '1',
    goalId: '1',
    tag: 'stage 2',
    q: '',
  }, 1);

  t.ok(results.similarPeople.some(person => person.display_name === 'Alex'));
  t.ok(results.logs.some(log => log.title === 'Day 18 short walk test'));
  t.ok(results.threads.some(thread => thread.title === 'When should I stop a session?'));
  t.end();
});

t.test('new log updates latest pain state for Home and Account', t => {
  const { db, hub } = seededHub();
  t.teardown(() => db.close());

  const result = hub.createRecoveryLog(1, {
    bodyAreaId: 1,
    recoveryStageId: 2,
    activityGoalId: 1,
    title: 'A2 demo controlled walk',
    movementTried: 'Eight minute walk with one short stair test.',
    symptomsAndLimits: 'No swelling and mild stiffness only.',
    whatHelped: 'Stopping before fatigue.',
    questionForCommunity: 'How do others decide when to add stairs?',
    painBefore: 1,
    painAfter: 2,
    confidenceLevel: 'medium',
    visibility: 'members',
    allowSimilarStageDiscovery: 1,
    askForReplies: 1,
  });

  hub.addLogTag(Number(result.lastInsertRowid), 2);
  const latestPain = hub.latestPainState(1);

  t.equal(latestPain?.recovery_log_id, Number(result.lastInsertRowid));
  t.equal(latestPain?.pain_before, 1);
  t.equal(latestPain?.pain_after, 2);
  t.end();
});

t.test('detail actions support reply, save, and report flow', t => {
  const { db, hub } = seededHub();
  t.teardown(() => db.close());

  const repliesBefore = hub.discussionReplies(2).length;
  hub.addReply(2, 1, 'A2 test reply: I stopped when pain changed my movement.');
  t.equal(hub.discussionReplies(2).length, repliesBefore + 1);

  hub.saveItem(1, 'thread', 2);
  t.ok(hub.savedItems(1).some(item => item.item_type === 'thread' && item.item_id === 2));

  hub.reportContent(1, 'thread', 2, 'A2 test moderation report.');
  const reportCount = db.prepare('SELECT count(*) AS count FROM content_reports WHERE discussion_thread_id = 2;').get();
  t.equal(reportCount.count, 1);
  t.end();
});
