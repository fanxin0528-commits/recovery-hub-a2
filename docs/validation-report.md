# Validation Report

Date: 2026-05-15

## Current Scope

This A2 prototype is a BlaBla community hub for recovery-stage support. It uses the course starter style: Mojo routes, controller classes, model classes, server-rendered templates, HTMX fragments, SQLite, and prepared statements.

## Routes Checked

- `/login` - seeded BlaBla test member session picker.
- `/` - Home snapshot: current context, latest pain state, next action, and recent relevant content.
- `/context` - Recovery context setup without manual pain input.
- `/stage` - Stage dashboard with guidance, logs, discussions, and movement ideas.
- `/log/new` - Structured log form; pain before / pain after become the latest pain source.
- `/explore` - similar members, logs, and discussions with GET filters and HTMX partial refresh.
- `/detail/thread/1` - discussion detail with replies, save, and report actions.
- `/account` - read-only latest pain state plus context and preferences.

## Database Behaviour

- `recovery_logs` is the source of latest pain state for Home and Account.
- `user_recovery_contexts` stores body area, recovery stage, activity goal, experience, preferences, and limitations. It does not store pain level.
- Explore joins users, context, logs, discussion threads, and tags to support list/search views.
- Detail pages read one log or thread plus related replies or similar-stage content.
- Form submissions write to `user_recovery_contexts`, `recovery_logs`, `discussion_replies`, `saved_items`, and `content_reports`.

## Course Method Checks

- Week 03/04: route handlers call controller methods and render `.html.tmpl` views.
- Week 04/09: dynamic content is backed by SQLite and JOIN queries.
- Week 05/10: HTMX is used only for small partial updates, with normal GET/POST fallback.
- Week 09: database files preserve the `wireframe -> DDD -> ERD -> schema -> seed` chain.
- Week 11: the UI keeps visible focus states, form labels, text beside icons, and decorative SVG icons with `aria-hidden`.

## Responsive Checks

- Desktop uses the top navigation bar.
- Mobile hides the desktop tab row and uses a fixed square segmented bottom nav.
- Mobile page content has bottom padding so the nav does not cover forms or edge-action buttons.
- Tags and nav labels are constrained to prevent line breaks or overflow.

## Known Constraints

- This is a local SQLite prototype, so GitHub Pages cannot run the backend.
- Authentication is intentionally a classroom test-member session picker, not a production BlaBla login flow.
- The app avoids a separate React/JSON API architecture so it stays close to the course starter.
