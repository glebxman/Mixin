# AI Service

FastAPI service that exposes internal AI endpoints to the API service:
chat (`/api/chat/...`), image generation (`/api/images/...`),
recommendations, quests, and analytics.

## Internal authentication

Every request to `/api/{analytics,recommendations,quests,ai,images}/...`
MUST include a valid `X-Internal-Token` header that constant-time-equals
the `INTERNAL_SERVICE_TOKEN` env var. The check is performed by a global
FastAPI middleware (`internal_token_guard` in `main.py`) BEFORE any
route handler runs. Mismatches are rejected with HTTP 401.

CORS preflight (`OPTIONS`) requests are allowed without the token; the
CORS middleware handles those.

## Health probes

`GET /health` returns `200 {"status": "ok"}` and is exempt from the
internal-token middleware so Kubernetes / Docker / load balancer
probes can succeed. No other endpoint is exempt — every request to
`/api/{analytics,recommendations,quests,ai,images}/...` MUST include
a valid `X-Internal-Token` header that constant-time-equals the
`INTERNAL_SERVICE_TOKEN` env var, otherwise the request is rejected
with HTTP 401 before any handler runs.

`GET /healthz` is reserved as a conventional alias and is also exempt.
