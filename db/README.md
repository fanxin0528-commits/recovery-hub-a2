# Recovery Hub SQLite Database

## 目录说明

本目录是 Recovery Hub A2 原型的 SQLite 数据库部分：

- `../docs/ddd.md`：按 view 拆分的 DDD、JSON 查询结构、任务看板。
- `../docs/erd.md`：ERD 图和表结构清单。
- `schema.sql`：SQLite 表结构。
- `seed.sql`：测试数据。
- `recovery_hub.db`：本地 demo 数据库，可由脚本重新生成。

## 创建数据库

在项目根目录执行：

```sh
npm run db:reset
```

这个脚本会删除旧的 `db/recovery_hub.db`，再按 `schema.sql` 和 `seed.sql` 重新创建数据库。

## 核心验证查询

### 1. Home：当前用户 context + latest pain state

```sql
SELECT
  u.display_name,
  ba.name AS body_area,
  rs.name AS recovery_stage,
  ag.name AS activity_goal,
  (
    SELECT rl.pain_after
    FROM recovery_logs rl
    WHERE rl.user_id = u.user_id
    ORDER BY rl.log_date DESC, rl.created_at DESC
    LIMIT 1
  ) AS latest_pain_after
FROM users u
JOIN user_recovery_contexts c ON c.user_id = u.user_id
JOIN body_areas ba ON ba.body_area_id = c.body_area_id
JOIN recovery_stages rs ON rs.recovery_stage_id = c.recovery_stage_id
JOIN activity_goals ag ON ag.activity_goal_id = c.activity_goal_id
WHERE u.user_id = 1;
```

### 2. Explore：按 stage / body area / goal 筛选

```sql
SELECT
  rl.recovery_log_id,
  rl.title,
  u.display_name AS author_name
FROM recovery_logs rl
JOIN users u ON u.user_id = rl.user_id
WHERE rl.recovery_stage_id = 2
  AND rl.body_area_id = 1
  AND rl.activity_goal_id = 1
  AND rl.visibility IN ('members', 'public')
ORDER BY rl.created_at DESC;
```

### 3. Detail：discussion + replies

```sql
SELECT
  dt.title,
  dr.reply_body,
  u.display_name AS reply_author
FROM discussion_threads dt
JOIN discussion_replies dr ON dr.discussion_thread_id = dt.discussion_thread_id
JOIN users u ON u.user_id = dr.author_user_id
WHERE dt.discussion_thread_id = 1
ORDER BY dr.created_at;
```

### 4. Form 提交后：新增 log 并验证 pain level 来源

```sql
INSERT INTO recovery_logs (
  user_id,
  body_area_id,
  recovery_stage_id,
  activity_goal_id,
  title,
  movement_tried,
  symptoms_and_limits,
  what_helped,
  question_for_community,
  pain_before,
  pain_after,
  confidence_level,
  visibility
) VALUES (
  1,
  1,
  2,
  1,
  'New log form test',
  'Eight minute walk and step-down practice.',
  'No swelling increase.',
  'Stopping early kept pain stable.',
  'Should I repeat this tomorrow?',
  1,
  2,
  'medium',
  'members'
);

SELECT title, pain_before, pain_after
FROM recovery_logs
WHERE user_id = 1
ORDER BY created_at DESC, recovery_log_id DESC
LIMIT 1;
```

## 设计决策

- Home 不再承担 “find people recovering at your stage” 的主要搜索任务。
- Explore 是相似用户、相似日志和相似讨论的发现入口。
- My Account / Context Summary 不手动编辑 pain level。
- Pain level 由最新 structured recovery log 推导，减少重复维护。
- `recovery_logs` 与 `log_tags` 是多对多，通过 `recovery_log_tags` 拆表。

## Changelog

### 2026-05-09

- A2 原型改为课程风格实现：Mojo.js route handlers + `better-sqlite3` + server-rendered templates。
- `schema.sql` 和 `seed.sql` 的表结构不变。
- `npm run db:reset` 改为使用 Node 脚本和 `better-sqlite3` 重建 demo database。

### 2026-05-06

- 更新 A2 任务看板分工文档。
- 主要产品结构、数据库设计和实现负责人暂定为 `Fanxin`。
- 视觉 / UI 负责人更新为 `Bai Hao Fang`，负责 Figma high fidelity UI、pixel icon system、block / button 样式一致性和 desktop / mobile visual QA。
- 本次未修改 `schema.sql` 或 `seed.sql`，不需要重新创建数据库。

### 2026-05-01

- 创建第一版 DDD、ERD、SQLite schema 和 seed data。
- 加入 Home、Explore、Stage Dashboard、Structured Log、Detail、My Account 所需数据结构。
- 根据课堂讨论方向调整：Explore 承担发现任务，pain level 从 logs 推导。

以后每次表结构变动必须在这里记录：

- 日期
- 改动表名
- 改动字段 / 关系
- 改动原因
- 是否需要更新 seed data
