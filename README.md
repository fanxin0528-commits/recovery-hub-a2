# Recovery Hub A2

Recovery Hub is a SQLite-backed web prototype for DECO2017 A2. This version is intentionally written in the same style as the course examples: Mojo.js routes, `better-sqlite3` queries, server-rendered templates, and normal HTML forms.

The design still follows the Figma high fidelity direction, but the code is kept simple enough to read as a student assignment instead of a production React app.

## What The Prototype Shows

- A fixed logged-in demo user: `user_id = 1`.
- Home as a recovery-state snapshot and next-action page.
- Explore as the place to find similar people, logs, and discussions.
- Structured recovery logs as the source of latest pain state.
- My Account showing pain state as read-only from the latest log.
- No signup page and no guest session.

## Course-Style Workflow

The project follows the assignment chain:

```text
wireframe -> DDD -> ERD -> SQLite schema/seed -> Mojo routes -> rendered views
```

Main course patterns used:

- `@mojojs/core` route handlers.
- `ctx.render({ view, layout }, data)` for templates.
- `better-sqlite3` prepared statements.
- SQLite tables from `db/schema.sql`.
- Seed data from `db/seed.sql`.
- POST forms for context updates, new recovery logs, replies, saved items, and reports.

## Tech Stack

- TypeScript
- Mojo.js (`@mojojs/core`)
- SQLite
- `better-sqlite3`
- HTML templates in `views/`
- CSS in `public/app.css`

## Run Locally

```sh
npm install
npm run db:reset
npm run dev
```

The app runs at:

```text
http://127.0.0.1:3000/
```

Useful checks:

```sh
npm run lint
npm run build
```

## Main Routes

- `/` - Hub Home
- `/context` - Recovery Context Setup
- `/stage` - Stage Dashboard
- `/log/new` - Structured Recovery Log
- `/detail/thread/1` - Log / Discussion Detail
- `/explore` - Explore Community
- `/account` - My Account / Context Summary

## Database Files

- `db/schema.sql`
- `db/seed.sql`
- `db/recovery_hub.db`
- `db/README.md`
- `docs/ddd.md`
- `docs/erd.md`

Important rule: pain level is not edited in My Account or Recovery Context. It is derived from the newest `recovery_logs` row.

## Sharing With Teammates

The GitHub repository is the easiest place for teammates to access the project. They can clone the repo, run the commands above, and view the prototype locally.

GitHub Pages is not the main target because this prototype needs a local SQLite database and Mojo.js server.
