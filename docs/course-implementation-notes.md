# Course Implementation Notes

This prototype is intentionally implemented in a DECO2017 course style rather than as a production SPA.

## Patterns Used From Class

- Route handlers are written with `@mojojs/core`.
- Pages are rendered on the server with `ctx.render({ view, layout }, data)`.
- SQLite queries use `better-sqlite3` prepared statements.
- Form submissions use normal POST routes:
  - `/context`
  - `/logs`
  - `/discussion-replies`
  - `/saved-items`
  - `/content-reports`
- Templates live in `views/`.
- Static CSS lives in `public/app.css`.

## Simplifications

- There is no signup or login flow.
- The current user is fixed as `user_id = 1`.
- The app does not use React, Vite, or a separate JSON API layer.
- The UI is high-fidelity enough for the concept, but the code is kept readable for A2.

## Product Rules Kept

- Home shows current recovery state and the next useful action.
- Explore owns similar people / logs / discussions discovery.
- My Account does not contain a manual pain slider.
- Latest pain state is derived from the newest row in `recovery_logs`.
