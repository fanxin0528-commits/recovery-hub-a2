# Demo Walkthrough

This document gives markers and teammates a short route through the Recovery Hub A2 prototype. The goal is to show the relationship between the BlaBla community concept, the SQLite database, and the rendered web interface.

## Run The Prototype

```sh
npm install
npm run seed
npm run dev
```

Open:

```text
http://127.0.0.1:3000/
```

If the app redirects to `/login`, choose the seeded member `Fanxin`.

## Three-Minute Marker Route

### 1. Start With The Course-Style Session

Route: `/login`

What to show:

- The app uses a seeded BlaBla test member session, not a public signup page.
- This keeps the prototype aligned with the course starter pattern while still demonstrating a logged-in user journey.

Evidence in code:

- `src/controllers/auth.ts`
- `views/auth/loginPage.html.tmpl`
- `src/models/users.ts`

### 2. Explain Home As A Recovery Snapshot

Route: `/`

What to show:

- Home shows the current recovery context, latest pain state, recent relevant content, saved items, and next actions.
- Home does not ask the user to search for similar people first. That task belongs in Explore.
- Latest pain state is read from the newest `recovery_logs` row.

Evidence in code:

- `src/controllers/recovery.ts` -> `home`
- `src/models/recoveryHub.ts` -> `currentContext`, `latestPainState`, `logCards`, `threadCards`
- `views/home.html.tmpl`

### 3. Show Explore As The Discovery Space

Route: `/explore`

Suggested filters:

- Stage: `Controlled Return`
- Body: `Knee`
- Goal: `Return to running`

What to show:

- Explore returns similar BlaBla members, recovery logs, and discussion threads.
- The filters use normal GET form behaviour and HTMX partial rendering.
- This is where the "find people recovering at your stage" concept is located.

Evidence in code:

- `views/explore.html.tmpl`
- `views/partials/explore-results.html.tmpl`
- `src/controllers/recovery.ts` -> `explore`
- `src/models/recoveryHub.ts` -> `exploreData`

### 4. Open A Detail Page And Interact

Route: `/detail/thread/1`

What to show:

- The detail page shows the discussion context, replies, save/report actions, and similar-stage prompts.
- Posting a reply uses HTMX to refresh the reply section, but the form still has a normal POST fallback.
- Save and report write to SQLite tables.

Evidence in code:

- `views/detail.html.tmpl`
- `views/partials/thread-replies.html.tmpl`
- `src/controllers/recovery.ts` -> `replyAction`, `saveAction`, `reportAction`
- `db/schema.sql` -> `discussion_replies`, `saved_items`, `content_reports`

### 5. Submit A Structured Recovery Log

Route: `/log/new`

Suggested demo values:

- Title: `A2 demo controlled walk`
- Movement tried: `Eight minute walk with one short stair test.`
- Symptoms and limits: `No swelling and mild stiffness only.`
- What helped: `Stopping before fatigue.`
- Pain before: `1`
- Pain after: `2`
- Confidence: `medium`

What to show:

- Submitting the form inserts a new `recovery_logs` row.
- The app redirects back to Home with a success message.
- Home and Account now show latest pain state from the new log.

Evidence in code:

- `views/log-new.html.tmpl`
- `src/controllers/recovery.ts` -> `logsAction`
- `src/models/recoveryHub.ts` -> `createRecoveryLog`

### 6. Confirm Account Is Read-Only For Pain

Route: `/account`

What to show:

- Account shows the logged-in member, recovery context, preferences, saved items, and read-only pain state.
- There is no manual pain slider in Account or Recovery Context.
- This supports the design decision that pain state should come from lived recovery logs.

Evidence in code:

- `views/account.html.tmpl`
- `views/context.html.tmpl`
- `docs/ddd.md`
- `docs/erd.md`

## Verification Commands

Run before submission:

```sh
npm run seed
npm run lint
npm run test
npm run build
```

Expected result:

- `npm run lint` passes TypeScript and CSS checks.
- `npm run test` passes the model/data-flow tests.
- `npm run build` compiles TypeScript into `lib/`.

## Assessment Evidence Map

| Requirement | Evidence |
| --- | --- |
| Wireframe to DDD to ERD to schema | `docs/ddd.md`, `docs/erd.md`, `db/schema.sql`, `db/seed.sql` |
| SQLite-backed dynamic prototype | `db/recovery_hub.db`, `src/models/recoveryHub.ts` |
| Course-style routing and templates | `src/index.ts`, `src/controllers/`, `views/*.html.tmpl` |
| HTMX partial updates | Explore filters and discussion replies |
| Main user flow | `/login` -> `/` -> `/explore` -> `/detail/thread/1` -> `/log/new` -> `/account` |
| Pain state derived from logs | `latestPainState()` and `recovery_logs` |
| Responsive interface | `public/app.css`, desktop top nav, mobile fixed bottom nav |
| Validation | `docs/validation-report.md`, `test/recoveryHubModel.test.js` |

## Known Constraints

- GitHub Pages cannot run this app because it needs the Mojo server and SQLite database.
- The login page is a classroom test-session picker, not the full BlaBla authentication system.
- The current goal is an A2 working prototype, not a production deployment.
