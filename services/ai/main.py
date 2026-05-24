import hmac

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uvicorn
from pathlib import Path

env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Bootstrap-time secret/threshold validation. Must run AFTER load_dotenv
# (so values from the workspace ``.env`` are visible in ``os.environ``)
# but BEFORE any ``from routers import ...`` line, because router modules
# may read env vars at import time. The validators are pure: they only
# write to stderr / call sys.exit when invoked — see
# ``services/ai/bootstrap/required_secrets.py``.
import os
from bootstrap.required_secrets import (
    assert_required_secrets,
    assert_positive_integers,
    AI_REQUIRED_SECRETS,
    AI_RATE_LIMIT_THRESHOLDS,
)

assert_required_secrets(AI_REQUIRED_SECRETS, os.environ)
assert_positive_integers(AI_RATE_LIMIT_THRESHOLDS, os.environ)

from config import INTERNAL_SERVICE_TOKEN
from routers import chat, recommendations, quests, analytics, images

app = FastAPI(title="EdTech UZ AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3100", "http://localhost:3200", "http://localhost:3300", "http://localhost:3400"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Paths exempt from the internal-token guard. ``/health`` is the
# documented probe endpoint used by Kubernetes / Docker / load balancer
# health checks; ``/healthz`` is the conventional alias. Every other
# request must present a matching ``X-Internal-Token`` header.
_HEALTH_PATHS = {"/health", "/healthz"}


@app.middleware("http")
async def internal_token_guard(request: Request, call_next):
    """Constant-time-compare ``X-Internal-Token`` against the configured
    ``INTERNAL_SERVICE_TOKEN`` on every non-exempt request. Rejects
    mismatches with HTTP 401 BEFORE any route handler runs.

    Registered AFTER the CORS middleware so CORS is the outermost layer
    (FastAPI executes middleware in inverse-registration order). This
    keeps preflight handling and CORS headers intact even on 401s.
    """
    path = request.url.path
    method = request.method.upper()
    # CORS preflight: allow without token. The CORS middleware enforces
    # the actual policy; preflight requests are OPTIONS by definition.
    if method == "OPTIONS":
        return await call_next(request)
    if path in _HEALTH_PATHS:
        return await call_next(request)
    expected = INTERNAL_SERVICE_TOKEN
    if not expected:
        # In dev with no token configured, the bootstrap validator
        # already emitted a warning. Fail-closed here anyway: never
        # serve internal routes without a configured token.
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    got = request.headers.get("X-Internal-Token", "")
    if not got or not hmac.compare_digest(got, expected):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(quests.router, prefix="/api/quests", tags=["quests"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
