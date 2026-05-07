# Recovery Hub A2 数据库 DDD

## 1. Schema 设计总结

这套数据库围绕 Recovery Hub 的真实交互来设计：用户先拥有一个恢复背景（受伤部位、恢复阶段、活动目标），首页只展示当前状态和相关内容；Explore 承担搜索相似用户、相似日志和讨论的任务；pain level 不作为 My Account 里的手动字段保存，而是从用户每次提交的 structured recovery log 中推导当前状态。这样可以避免静态 mock 数据，也能支撑 list view、detail view、form 提交和后续状态变化。

## 2. DDD 按 View 拆分

### View 1: Hub Home

**功能**

- 显示当前用户的恢复背景。
- 显示最新 pain level，但该值来自最近一条 `recovery_logs`，不是从 account/context 手动维护。
- 展示近期相关 logs、threads 和继续记录提示。

**Entities**

- `users`
- `user_recovery_contexts`
- `body_areas`
- `recovery_stages`
- `activity_goals`
- `recovery_logs`
- `discussion_threads`
- `saved_items`

**Attributes**

- User: `user_id`, `username`, `display_name`, `role`, `is_active`
- Context: `body_area_id`, `recovery_stage_id`, `activity_goal_id`, `experience_level`, `current_limitation`
- Latest log: `pain_before`, `pain_after`, `confidence_level`, `log_date`
- Recommended content: `title`, `created_at`, `visibility`, `status`

**Relationships**

- 一个 user 有一个 active recovery context。
- 一个 context 指向一个 body area、一个 recovery stage、一个 activity goal。
- 一个 user 有多条 recovery logs。
- Home 的 latest pain level 由该 user 最新一条 recovery log 推导。
- 一个 user 可以 save 多个 logs 或 discussion threads。

**数据查询结构示例**

```json
{
  "currentUser": {
    "userId": 1,
    "displayName": "Fanxin"
  },
  "recoveryContext": {
    "bodyArea": "Knee",
    "stage": "Controlled Return",
    "activityGoal": "Return to running",
    "currentLimitation": "Mild stiffness after stairs, no swelling increase."
  },
  "latestPainState": {
    "source": "recovery_logs",
    "logId": 1,
    "painBefore": 2,
    "painAfter": 3,
    "confidenceLevel": "medium",
    "logDate": "2026-05-01"
  },
  "recommendedContent": [
    {
      "type": "log",
      "id": 2,
      "title": "Day 18 short walk test",
      "matchReason": "same stage, same body area, same goal"
    },
    {
      "type": "thread",
      "id": 1,
      "title": "Pain after stairs during controlled return",
      "matchReason": "same stage and body area"
    }
  ]
}
```

### View 2: Recovery Context Setup

**功能**

- 设置或更新用户在 Recovery Hub 内的恢复背景。
- 不做 signup；用户身份来自已有 session。
- 不手动维护 pain level。

**Entities**

- `users`
- `user_recovery_contexts`
- `body_areas`
- `recovery_stages`
- `activity_goals`

**Attributes**

- Context form: `body_area_id`, `recovery_stage_id`, `activity_goal_id`, `experience_level`, `current_limitation`
- Preferences: `personalize_recommendations`, `share_stage_tags`, `allow_optional_tracking`

**Relationships**

- 一个 user 最多一条 `user_recovery_contexts`。
- Form 的 dropdown options 来自 `body_areas`、`recovery_stages`、`activity_goals`。

**数据查询结构示例**

```json
{
  "formOptions": {
    "bodyAreas": ["Knee", "Ankle", "Hip", "Shoulder"],
    "recoveryStages": ["Early Recovery", "Controlled Return", "Building Confidence", "Return to Activity"],
    "activityGoals": ["Return to running", "Return to gym training", "Walk without pain", "Improve mobility"]
  },
  "currentValues": {
    "bodyAreaId": 1,
    "recoveryStageId": 2,
    "activityGoalId": 1,
    "experienceLevel": "recreational",
    "currentLimitation": "Mild stiffness after stairs, no swelling increase.",
    "personalizeRecommendations": 1,
    "shareStageTags": 1,
    "allowOptionalTracking": 0
  }
}
```

### View 3: Stage Dashboard

**功能**

- 按当前 recovery stage 聚合日志、讨论和行动提示。
- 展示相似阶段用户的内容，减少 generic fitness feed 噪音。

**Entities**

- `recovery_stages`
- `user_recovery_contexts`
- `recovery_logs`
- `discussion_threads`
- `body_areas`
- `activity_goals`
- `users`

**Attributes**

- Stage: `stage_order`, `name`, `description`, `guidance`, `intensity_level`
- Logs: `title`, `movement_tried`, `pain_before`, `pain_after`, `confidence_level`, `visibility`
- Threads: `title`, `question_body`, `status`

**Relationships**

- 当前用户 context 决定 stage dashboard 的 primary filter。
- Recovery logs 和 discussion threads 都通过 `recovery_stage_id`、`body_area_id`、`activity_goal_id` 与当前用户匹配。

**数据查询结构示例**

```json
{
  "stage": {
    "id": 2,
    "name": "Controlled Return",
    "guidance": "Prioritise similar-stage logs and structured reflections."
  },
  "matchingLogs": [
    {
      "logId": 1,
      "title": "First easy jog after knee strain",
      "painAfter": 3,
      "confidenceLevel": "medium"
    }
  ],
  "matchingThreads": [
    {
      "threadId": 2,
      "title": "When should I stop a session?",
      "status": "open"
    }
  ]
}
```

### View 4: Structured Recovery Log Form

**功能**

- 用户提交结构化恢复日志。
- pain level 在这里记录，之后用于 Home / My Account 的 latest state。
- 支撑 form 提交后的数据库状态变化。

**Entities**

- `recovery_logs`
- `log_tags`
- `recovery_log_tags`
- `users`
- `body_areas`
- `recovery_stages`
- `activity_goals`

**Attributes**

- Log form: `title`, `log_date`, `movement_tried`, `symptoms_and_limits`, `what_helped`, `question_for_community`
- State fields: `pain_before`, `pain_after`, `confidence_level`
- Sharing: `visibility`, `allow_similar_stage_discovery`, `ask_for_replies`

**Relationships**

- 一个 user 有多条 recovery logs。
- 一个 recovery log 指向 stage、body area、activity goal。
- 一个 recovery log 可以有多个 tags。
- 多对多：`recovery_logs` ↔ `log_tags` 通过 `recovery_log_tags`。

**数据查询结构示例**

```json
{
  "submitLog": {
    "userId": 1,
    "bodyAreaId": 1,
    "recoveryStageId": 2,
    "activityGoalId": 1,
    "title": "New log form test",
    "movementTried": "Eight minute walk and step-down practice.",
    "painBefore": 1,
    "painAfter": 2,
    "confidenceLevel": "medium",
    "visibility": "members",
    "tags": ["low intensity", "stage 2"]
  },
  "afterSubmitLatestPain": {
    "source": "latest recovery_logs row",
    "painBefore": 1,
    "painAfter": 2
  }
}
```

### View 5: Log / Discussion Detail

**功能**

- 展示一条 log 或 discussion 的完整内容。
- 展示 tags、作者、相似背景、replies。
- 支撑 save、reply、report。

**Entities**

- `recovery_logs`
- `discussion_threads`
- `discussion_replies`
- `users`
- `log_tags`
- `saved_items`
- `content_reports`

**Attributes**

- Detail: `title`, `movement_tried`, `symptoms_and_limits`, `what_helped`, `question_for_community`
- Thread: `question_body`, `status`
- Reply: `reply_body`, `is_experience_share`, `is_marked_helpful`
- Moderation: `reason`, `status`, `details`

**Relationships**

- 一个 discussion thread 有多条 replies。
- 一个 user 可以 save log 或 thread。
- 一个 report 只能指向一个目标：log、thread 或 reply。

**数据查询结构示例**

```json
{
  "detail": {
    "type": "thread",
    "threadId": 1,
    "title": "Pain after stairs during controlled return",
    "author": "Mina",
    "stage": "Controlled Return",
    "bodyArea": "Knee",
    "goal": "Return to running"
  },
  "replies": [
    {
      "replyId": 1,
      "author": "Fanxin",
      "body": "I reduced stair volume for two days...",
      "isExperienceShare": 1
    }
  ],
  "actions": {
    "canSave": true,
    "canReport": true,
    "canReply": true
  }
}
```

### View 6: Explore Community

**功能**

- 负责搜索和发现相似用户、相似 logs、相似 discussion threads。
- 承接原 wireframe 中 “Find people recovering at your stage” 的任务。

**Entities**

- `users`
- `user_recovery_contexts`
- `recovery_logs`
- `discussion_threads`
- `body_areas`
- `recovery_stages`
- `activity_goals`
- `log_tags`

**Attributes**

- Filters: `body_area_id`, `recovery_stage_id`, `activity_goal_id`, `tag_id`, search text
- Results: `title`, `type`, `author`, `created_at`, `pain_after`, `status`

**Relationships**

- Explore 通过 stage/body/goal 匹配 logs 和 threads。
- Tags 通过 junction table 筛选 recovery logs。
- Similar members 通过 `user_recovery_contexts` 匹配。

**数据查询结构示例**

```json
{
  "filters": {
    "bodyAreaId": 1,
    "recoveryStageId": 2,
    "activityGoalId": 1,
    "search": "stairs confidence"
  },
  "results": {
    "logs": [
      {
        "id": 1,
        "title": "First easy jog after knee strain",
        "author": "Fanxin",
        "painAfter": 3
      }
    ],
    "threads": [
      {
        "id": 1,
        "title": "Pain after stairs during controlled return",
        "status": "answered"
      }
    ],
    "members": [
      {
        "userId": 2,
        "displayName": "Alex",
        "matchReason": "same stage, body area, and goal"
      }
    ]
  }
}
```

### View 7: My Account / Context Summary

**功能**

- 展示用户身份、恢复背景、privacy/preferences。
- 不提供 pain level 手动编辑。
- 显示 latest pain state，但来源仍是最新 recovery log。

**Entities**

- `users`
- `user_recovery_contexts`
- `recovery_logs`
- `saved_items`

**Attributes**

- Account: `username`, `display_name`, `email`, `role`
- Preferences: `personalize_recommendations`, `share_stage_tags`, `allow_optional_tracking`
- Latest state: latest `pain_before`, `pain_after`, `confidence_level`, `log_date`

**Relationships**

- Account 展示 user + context 的一对一关系。
- Account 中的 latest pain state 是 user → recovery_logs 的一对多中最新一条。

**数据查询结构示例**

```json
{
  "account": {
    "userId": 1,
    "username": "fanxin",
    "displayName": "Fanxin"
  },
  "context": {
    "stage": "Controlled Return",
    "bodyArea": "Knee",
    "goal": "Return to running"
  },
  "latestPainState": {
    "editableHere": false,
    "source": "recovery_logs",
    "painAfter": 3,
    "logDate": "2026-05-01"
  }
}
```

## 3. DDD 检查

- 不缺核心 entity：用户、恢复背景、日志、讨论、回复、标签、收藏、举报都已覆盖。
- 多对多关系已拆表：`recovery_logs` 和 `log_tags` 通过 `recovery_log_tags`。
- 关键字段已明确：pain level 在 `recovery_logs`，不在 `user_recovery_contexts`。
- 主要产品结构、数据库设计、DDD、ERD 和表结构负责人暂定为 `Fanxin`。
- 视觉设计负责人为 `Bai Hao Fang`，负责 Figma high fidelity UI、pixel icon system、block / button 样式一致性和 desktop / mobile visual QA。
- 预计完成时间仍使用 `TBD`，后续团队确认截止日期后替换。

## 4. A2 任务看板（可复制到 Notion / Trello）

- [ ] **View：Hub Home**
  - 对应功能：显示用户恢复背景、最新 pain state、近期相关 logs / threads。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：能用 `user_id = 1` 查询 context、latest pain state 和推荐内容；页面正常渲染且不出现手动 pain level 输入。

- [ ] **View：Recovery Context Setup**
  - 对应功能：设置 body area、stage、goal、experience level 和 preferences。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：能读取 options；提交后能 insert/update `user_recovery_contexts`；不保存 pain level。

- [ ] **View：Stage Dashboard**
  - 对应功能：按当前 recovery stage 展示相似 logs、threads 和 stage guidance。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：能按 `recovery_stage_id`、`body_area_id`、`activity_goal_id` 查询匹配内容；页面渲染 stage guidance 和列表。

- [ ] **View：Structured Recovery Log Form**
  - 对应功能：提交结构化恢复日志，记录 pain before / pain after。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：提交后能新增 `recovery_logs`；latest pain state 查询能反映新日志。

- [ ] **View：Log / Discussion Detail**
  - 对应功能：查看 log 或 discussion 详情，展示 replies、tags、save/report 操作。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：能查询单条 detail、作者、tags、replies；能新增 reply；能 save 或 report。

- [ ] **View：Explore Community**
  - 对应功能：搜索/筛选相似用户、logs、discussion threads。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：能按 stage/body area/goal/tag/search text 查询；Explore 承担 “find people recovering at your stage”。

- [ ] **View：My Account / Context Summary**
  - 对应功能：显示账号、恢复背景和 preferences；展示从 logs 推导出的 latest pain state。
  - DDD 完成状态：已完成
  - ERD 完成状态：已完成
  - 表结构完成状态：已完成
  - 负责人：Fanxin
  - 视觉 / UI 负责人：Bai Hao Fang
  - 视觉 / UI 职责：Figma high fidelity UI、pixel icon system、block / button 样式一致性、desktop / mobile visual QA。
  - 预计完成时间：TBD
  - 验收标准：页面不提供 pain level 手动编辑；latest pain state 来自最新 `recovery_logs`。
