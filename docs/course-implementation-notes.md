# Course Implementation Notes

This prototype is intentionally implemented in a DECO2017 course style rather than as a production SPA.

## Patterns Used From Class

- Route declarations are written with `@mojojs/core` in `src/index.ts`.
- Page behaviour is handled by controller classes in `src/controllers/`.
- Database reads and writes are handled by model classes in `src/models/`.
- The app uses the course starter login/session pattern so testers can choose a seed user before viewing protected pages.
- Pages are rendered on the server with `ctx.render({ view, layout }, data)`.
- SQLite queries use `better-sqlite3` prepared statements.
- Explore uses `hx-get` to refresh filtered results as a server-rendered partial.
- Discussion replies use `hx-post` to refresh the reply area as a server-rendered partial.
- Routes check `ctx.req.get('HX-Request') === 'true'` before deciding whether to render a full page or a fragment.
- Form submissions use normal POST routes:
  - `/context`
  - `/logs`
  - `/discussion-replies`
  - `/saved-items`
  - `/content-reports`
- Templates live in `views/`.
- Small HTMX fragments live in `views/partials/`.
- Static CSS lives in `public/app.css`.
- HTMX is loaded locally from `public/js/htmx.min.js`, copied from `htmx.org` during `npm install`.
- The database schema is also mirrored in `dbml/schema.dbml`, matching the starter expectation that DBML documents the database.
- Visual icons use a local SVG sprite in `public/icons.svg`; text labels remain visible so the icons are decorative rather than required for understanding.
- Week 11 accessibility checks are reflected through semantic form labels, visible focus states, readable contrast, and `aria-hidden` decorative icons.

## Simplifications

- There is no public signup flow. The login page is a local test-session picker based on the course starter.
- The current user comes from the encrypted Mojo session instead of being hard-coded in route handlers.
- The app does not use React, Vite, or a separate JSON API layer.
- HTMX is only used where the course examples use it: small client-server updates, not full application state.
- The UI is high-fidelity enough for the concept, but the code is kept readable for A2.

## Product Rules Kept

- Home shows current recovery state and the next useful action.
- Explore owns similar people / logs / discussions discovery.
- My Account does not contain a manual pain slider.
- Latest pain state is derived from the newest row in `recovery_logs`.
