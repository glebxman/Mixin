"""
AI service bootstrap-time validators.

This module is intentionally side-effect-free on import: the
``assert_*`` functions only act (write to ``sys.stderr`` and/or call
``sys.exit(1)``) when explicitly invoked. It does not import FastAPI,
the project's routers, or the standard ``logging`` module — at the
point this code runs, ``logging`` is typically not yet configured.

Production mode is detected from either ``NODE_ENV=production`` or
``ENV=production`` since several of our deployment targets use one or
the other.

Contract used by ``services/ai/main.py`` (task B.2):
    - In production: collect all offending variables, write a single
      line to ``sys.stderr`` listing every offender, and call
      ``sys.exit(1)``.
    - In dev/test: write a single ``WARN`` line and return — never
      raise — so local workflows are not blocked.
"""

from __future__ import annotations

from dataclasses import dataclass
import sys
from typing import Iterable, List, Mapping, Optional


@dataclass(frozen=True)
class SecretSpec:
    """A required secret env var spec.

    ``min_length`` is optional; when present, values shorter than this
    are considered invalid in addition to the standard unset / empty /
    whitespace-only checks.
    """

    name: str
    min_length: Optional[int] = None


@dataclass(frozen=True)
class IntegerSpec:
    """A required positive-integer env var spec.

    ``min`` is optional; when omitted, the validator enforces a
    strictly-positive integer (>= 1). Non-numeric, NaN, decimal, and
    negative values are always rejected.
    """

    name: str
    min: Optional[int] = None


def _is_production(env: Mapping[str, str]) -> bool:
    """Treat both ``NODE_ENV=production`` and ``ENV=production`` as production."""
    return env.get("NODE_ENV") == "production" or env.get("ENV") == "production"


def _emit_failure(prefix: str, offenders: List[str], env: Mapping[str, str]) -> None:
    """Write the single-line stderr message and exit(1) in prod, warn-and-return in dev."""
    names = ", ".join(offenders)
    if _is_production(env):
        sys.stderr.write(
            f"[bootstrap] Missing or invalid {prefix}: {names}\n"
        )
        sys.exit(1)
    else:
        sys.stderr.write(
            f"[bootstrap] WARN: Missing or invalid {prefix}: {names} (dev mode, continuing)\n"
        )


def assert_required_secrets(
    specs: Iterable[SecretSpec],
    env: Mapping[str, str],
) -> None:
    """Validate each spec against ``env``.

    A spec is considered offending when the env value is ``None``,
    empty, whitespace-only, or — when ``min_length`` is set — shorter
    than ``min_length``.

    In production: writes a single line to ``sys.stderr`` listing every
    offender and calls ``sys.exit(1)``. In dev/test: writes a warning
    line and returns. Never raises.
    """
    offenders: List[str] = []
    for spec in specs:
        value = env.get(spec.name)
        if value is None:
            offenders.append(spec.name)
            continue
        stripped = value.strip()
        if stripped == "":
            offenders.append(spec.name)
            continue
        if spec.min_length is not None and len(value) < spec.min_length:
            offenders.append(spec.name)
            continue

    if not offenders:
        return

    _emit_failure("Required_Secret(s)", offenders, env)


def assert_positive_integers(
    specs: Iterable[IntegerSpec],
    env: Mapping[str, str],
) -> None:
    """Validate that each spec resolves to a positive integer in ``env``.

    Rejects unset, empty/whitespace, non-numeric, negative, zero, NaN,
    and decimal/float values. ``int(value)`` is intentionally NOT used
    on the raw string because Python's ``int("1.5")`` raises but
    ``int(float("1.5"))`` truncates — we want to reject ``"1.5"`` as
    invalid input rather than silently coerce. We therefore parse via
    a strict integer regex.

    In production: writes a single line to ``sys.stderr`` listing every
    offender and calls ``sys.exit(1)``. In dev/test: writes a warning
    line and returns. Never raises.
    """
    offenders: List[str] = []
    for spec in specs:
        raw = env.get(spec.name)
        if raw is None:
            offenders.append(spec.name)
            continue
        stripped = raw.strip()
        if stripped == "":
            offenders.append(spec.name)
            continue

        # Strict integer parse: optional leading '+' then one or more digits.
        # This rejects "1.5", "nan", "inf", "1e3", " 1 2 ", etc.
        if not (stripped.lstrip("+").isdigit()):
            offenders.append(spec.name)
            continue

        try:
            value = int(stripped, 10)
        except ValueError:
            offenders.append(spec.name)
            continue

        threshold = spec.min if spec.min is not None else 1
        if value < threshold:
            offenders.append(spec.name)
            continue

    if not offenders:
        return

    _emit_failure("positive integer env var(s)", offenders, env)


# ---------------------------------------------------------------------------
# Spec lists for AI_Service. ``main.py`` imports and uses these directly.
# ---------------------------------------------------------------------------

AI_REQUIRED_SECRETS: List[SecretSpec] = [
    SecretSpec("OPENROUTER_API_KEY"),
    SecretSpec("INTERNAL_SERVICE_TOKEN", min_length=16),
]

AI_RATE_LIMIT_THRESHOLDS: List[IntegerSpec] = [
    IntegerSpec("AI_FREE_MESSAGES_PER_DAY"),
    IntegerSpec("AI_BASIC_MESSAGES_PER_DAY"),
    IntegerSpec("AI_PREMIUM_MESSAGES_PER_DAY"),
]
