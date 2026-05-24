# Work In Progress

`@edtech/analytics` is the planned ClickHouse-backed event analytics service for the EdTech platform. Its intended scope covers ingesting learning-activity events, aggregating usage and performance metrics, and exposing query endpoints that power the school and parent dashboards.

The package is currently a placeholder stub: there is no working server, no migrations, and no consumer wired up. It is intentionally excluded from `pnpm dev` and `pnpm build` (see the root `package.json` scripts, which pass `--filter=!@edtech/analytics` to Turbo) so that incomplete code does not break or slow the active pipeline. The directory is preserved so future implementation work can land here without re-bootstrapping the package.
