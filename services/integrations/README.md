# Work In Progress

`@edtech/integrations` is the planned home for third-party integrations on the EdTech platform — Kundalik.uz (school information system sync), Payme, and Uzum Pay (payment providers). Its intended scope covers outbound API clients, scheduled sync jobs, webhook handlers, and the shared retry/queueing plumbing those integrations need.

The package is currently a placeholder stub: there is no working server, no live credentials, and no consumer wired up. It is intentionally excluded from `pnpm dev` and `pnpm build` (see the root `package.json` scripts, which pass `--filter=!@edtech/integrations` to Turbo) so that incomplete code does not break or slow the active pipeline. The directory is preserved so future implementation work can land here without re-bootstrapping the package.
