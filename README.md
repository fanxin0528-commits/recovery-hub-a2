# Recovery Hub A2

SQLite-backed web prototype for the DECO2017 A2 Recovery Hub concept. The app translates the Figma high-fidelity direction into a working React interface with an Express API and local SQLite database.

## What This Prototype Shows

- A logged-in Recovery Hub session for `user_id = 1`.
- Home as a calm recovery-state snapshot, not a generic discovery feed.
- Explore as the place to find similar people, logs, and discussions.
- Structured recovery logs as the source of changing pain state.
- My Account / Context Summary showing pain state as read-only from the latest log.

## Tech Stack

- React + Vite + TypeScript
- Express API
- SQLite via Node `node:sqlite`
- Figma-inspired pixel UI system using CSS and inline SVG icons

## Run Locally

```sh
npm install
npm run db:reset
npm run dev
```

The app runs as:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3101`

If another local service uses port `3101`, run the API manually with a different port:

```sh
PORT=3111 npm run server
```

Then update `vite.config.ts` proxy target for local development.

## Database

The database package is included in this repository:

- `db/schema.sql`
- `db/seed.sql`
- `db/recovery_hub.db`
- `db/README.md`
- `docs/ddd.md`
- `docs/erd.md`

Rebuild the demo database at any time:

```sh
npm run db:reset
```

Important product rule: pain level is not edited in My Account or Recovery Context. It is derived from the newest `recovery_logs` row.

## Main Routes

- `/` - Hub Home
- `/context` - Recovery Context Setup
- `/stage` - Stage Dashboard
- `/log/new` - Structured Recovery Log
- `/detail/thread/1` - Log / Discussion Detail
- `/explore` - Explore Community
- `/account` - My Account / Context Summary

## API Endpoints

- `GET /api/home`
- `GET /api/context`
- `PUT /api/context`
- `GET /api/stage-dashboard`
- `GET /api/explore?stageId=&bodyAreaId=&goalId=&tag=&q=`
- `GET /api/detail/:type/:id`
- `POST /api/logs`
- `POST /api/discussion-replies`
- `POST /api/saved-items`
- `POST /api/content-reports`

## Sharing With Teammates

This project is intended to live in a clean GitHub repository named `recovery-hub-a2`. GitHub Pages is not the primary deployment target because the prototype uses a local SQLite-backed Express API. Teammates should clone the repo and run it locally.

If the school provides a required repository later, add it as a second remote:

```sh
git remote add school <school-repo-url>
git push school main
```

## Validation Commands

```sh
npm run db:reset
npm run lint
npm run build
```

The current implementation has been checked at desktop `1440x960` and mobile `390x844` viewports for text overflow, icon/text overlap, edge-action button overlap, and bottom navigation overlap.
