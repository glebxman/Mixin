# Security

## Reporting a vulnerability

Report suspected vulnerabilities privately by emailing `security@mixin.local` or by opening a draft advisory through GitHub Security Advisories on this repository. Do not file a public issue, do not attach exploit payloads to public PRs, and do not share reproduction artifacts in chat. We will acknowledge new reports within **24 hours** and provide an initial triage assessment (severity, owner, mitigation plan) within **7 days**. Please include the affected service, commit SHA or release tag, reproduction steps, and your preferred disclosure window.

## Rotation

The variables below were previously committed to the working-tree `.env`. Treat each as compromised and rotate the underlying credential before redeploying. For every variable: issue a new value at the provider, update the working-tree `.env`, update the production secrets store (Doppler / AWS Secrets Manager / Kubernetes `Secret` / Compose `env_file`, whichever this deployment uses), and restart every running worker, API container, and AI container so the new value is loaded.

Reference variables by name only. Never paste a real secret into this repo, into commit messages, or into chat.

### `OPENROUTER_API_KEY`

1. Sign in at https://openrouter.ai/keys and revoke the leaked key.
2. Create a new key, scoped to the minimum required models, and copy it once.
3. Update `OPENROUTER_API_KEY` in `.env` and in the production secrets store.
4. Redeploy `services/ai` (and any worker that calls OpenRouter) so the process re-reads the env.
5. Confirm `/api/ai/chat` returns 200 from a smoke test; confirm the old key returns 401 from `curl https://openrouter.ai/api/v1/models -H "Authorization: Bearer <old>"`.

### `DATABASE_URL` / `POSTGRES_PASSWORD`

1. Connect to the Postgres instance as a superuser and run `ALTER USER <app_user> WITH PASSWORD '<new>';`. If the leaked principal is the cluster admin, also rotate that role.
2. Update `POSTGRES_PASSWORD` and `DATABASE_URL` (the password segment of the URI) in `.env` and in the production secrets store.
3. If the database is managed (RDS, Cloud SQL, Neon, Supabase), rotate via the provider console and copy the new connection string.
4. Restart `services/api`, every BullMQ worker container, and any migration job so they reconnect with the new credential.
5. Run `pnpm --filter @edtech/api prisma migrate status` to confirm the new credential authenticates.

### `REDIS_URL` (rotate the Redis password if any)

1. If the Redis deployment uses `requirepass` or an ACL user, rotate that secret at the Redis side: `CONFIG SET requirepass <new>` and persist via `CONFIG REWRITE`, or `ACL SETUSER <user> >$<new>` for ACL deployments. Managed Redis (ElastiCache, Upstash, Redis Cloud) is rotated via the provider console.
2. Update the password segment of `REDIS_URL` in `.env` and in the production secrets store.
3. Restart `services/api` and every BullMQ worker container so connections re-authenticate.
4. Confirm with `redis-cli -u "$REDIS_URL" PING` that the new credential works and that the old one is rejected.

### `JWT_ACCESS_SECRET`

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
2. Update `JWT_ACCESS_SECRET` in `.env` and in the production secrets store.
3. Restart `services/api`. All previously issued access tokens become invalid; clients will be forced to refresh.
4. Confirm by hitting an authenticated endpoint with an old access token and observing 401, then signing in fresh.

### `JWT_REFRESH_SECRET`

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
2. Update `JWT_REFRESH_SECRET` in `.env` and in the production secrets store.
3. Restart `services/api`. All refresh tokens are invalidated and every signed-in session is forced to re-authenticate.
4. Communicate the forced sign-out to users if the impact is user-facing.

### `INTERNAL_SERVICE_TOKEN`

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Update `INTERNAL_SERVICE_TOKEN` simultaneously in the `services/api` and `services/ai` env (and in any worker container env) so the new token matches on both sides.
3. Restart `services/api` and `services/ai` together; the AI service rejects requests with the old token at the global middleware.
4. Confirm with `curl -H "X-Internal-Token: <new>" $AI_SERVICE_URL/api/ai/chat -X OPTIONS` that the new token is accepted and the old token returns 401.

### `GOOGLE_OAUTH_CLIENT_SECRET`

1. Open the Google Cloud Console, navigate to the OAuth 2.0 client used by `services/api`, and click **Reset secret** (or delete and recreate the client).
2. Update `GOOGLE_OAUTH_CLIENT_SECRET` in `.env` and in the production secrets store. `GOOGLE_OAUTH_CLIENT_ID` and the redirect URI stay the same unless you recreated the client.
3. Restart `services/api` so the OAuth callback handler reloads the secret.
4. Confirm sign-in with Google end-to-end on staging before declaring the rotation complete.

### `PAYME_SECRET_KEY`

1. Sign in to the Payme merchant cabinet and rotate the production merchant secret key.
2. Update `PAYME_SECRET_KEY` in `.env` and in the production secrets store.
3. Restart `services/api` (and any payments worker) so signed callbacks validate against the new key.
4. Run a smoke checkout on staging, confirm the webhook signature verifies, then promote to production.

### `PAYME_TEST_SECRET_KEY`

1. In the Payme sandbox/test cabinet, rotate the test merchant key.
2. Update `PAYME_TEST_SECRET_KEY` in `.env` and in the production secrets store (only the staging environment uses it).
3. Restart the staging `services/api` deployment so the test verifier picks up the new key.
4. Re-run the Payme integration test suite to confirm.

### `UZUM_SECRET_KEY`

1. Sign in to the Uzum Pay merchant cabinet and rotate the merchant secret key.
2. Update `UZUM_SECRET_KEY` in `.env` and in the production secrets store.
3. Restart `services/api` (and any payments worker) so the new signing key takes effect.
4. Run a sandbox payment to verify signature validation, then promote.

### `S3_ACCESS_KEY` / `S3_SECRET_KEY`

1. In the object-storage console (AWS IAM, MinIO, R2, Wasabi, etc.), revoke the leaked access key pair and create a new key pair scoped to the same bucket policy.
2. Update `S3_ACCESS_KEY` and `S3_SECRET_KEY` in `.env` and in the production secrets store.
3. Restart `services/api` and any worker that uploads or signs S3 URLs so the new credentials are used.
4. Confirm upload/download through a smoke test (e.g., `aws s3 ls s3://$S3_BUCKET --endpoint-url $S3_ENDPOINT`) and confirm the old key is rejected.

### `QDRANT_API_KEY`

1. In the Qdrant cluster admin (Qdrant Cloud console or self-hosted config), revoke the existing API key and issue a new one.
2. Update `QDRANT_API_KEY` in `.env` and in the production secrets store.
3. Restart `services/ai` so the embeddings client re-reads the key.
4. Confirm with `curl -H "api-key: <new>" $QDRANT_URL/collections` that the new key works.

### `KUNDALIK_API_KEY`

1. Contact Kundalik.uz integration support (or use the partner portal if available) to rotate the API key issued to this deployment.
2. Update `KUNDALIK_API_KEY` in `.env` and in the production secrets store.
3. Restart any service that calls the Kundalik API (`services/api` and the future `services/integrations`) so the new key is loaded.
4. Run a sync smoke test against the staging Kundalik endpoint to confirm.

## History purge

The previously tracked `.env` blob lives in git history; rotating secrets does not delete it. Purge the historical blob from every reachable ref, force-push, and require every collaborator to re-clone. Rotation must be **complete** before the force push, because the old blob is still readable until the rewrite propagates and old clones may linger.

Prerequisites:

- Ask every collaborator to push outstanding work and stop pushing until the purge is done.
- Run the rewrite on a fresh **mirror clone**, not on a working clone, to ensure every ref (branches, tags, notes) is rewritten.
- Install [`git-filter-repo`](https://github.com/newren/git-filter-repo) (`pip install git-filter-repo`) or, as a fallback, [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) (requires a JRE).

### Primary path: `git filter-repo`

```sh
# 1. Create a fresh mirror clone (do this in a scratch directory, not your working clone).
git clone --mirror git@github.com:<org>/<repo>.git mixin-purge.git
cd mixin-purge.git

# 2. Rewrite every ref to drop the .env path from history.
git filter-repo --invert-paths --path .env

# 3. Inspect: this should print nothing.
git log --all -- .env

# 4. Force-push the rewritten history to every ref.
git push --force-with-lease --all
git push --force-with-lease --tags
```

### Fallback: BFG Repo-Cleaner

```sh
# 1. Fresh mirror clone (same as above).
git clone --mirror git@github.com:<org>/<repo>.git mixin-purge.git
cd mixin-purge.git

# 2. Delete every blob whose path is .env from history.
bfg --delete-files .env

# 3. Expire reflogs and garbage-collect aggressively.
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Inspect.
git log --all -- .env

# 5. Force-push.
git push --force-with-lease --all
git push --force-with-lease --tags
```

After the force push, **every collaborator must re-clone**. Old clones still contain the leaked blob and will reintroduce it on the next push from that clone. Send a notice on the team channel: stop work, delete local clones, and `git clone` fresh from the rewritten remote. Existing PRs from forks must be rebased onto the rewritten history or recreated.

## Post-purge verification

- [ ] `git log --all -- .env` returns no commits.
- [ ] `git ls-files .env` returns no output.
- [ ] Every collaborator has confirmed they deleted their old clone and re-cloned from the rewritten remote.
- [ ] Every secret listed under [Rotation](#rotation) has been rotated at the provider, updated in the production secrets store, and verified by smoke test.
- [ ] CI builds green against the rewritten `main`/`master` branch.
- [ ] The repository's secret-scanning provider (GitHub secret scanning, gitleaks, trufflehog, etc.) reports no remaining hits for the rotated variables.
