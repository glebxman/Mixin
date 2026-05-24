/**
 * Shared Required_Secret bootstrap validator for the API_Service.
 *
 * Runs BEFORE Fastify and the application logger are initialized, so all
 * output goes through `process.stderr.write` and termination is handled by
 * `process.exit(1)`. The functions never throw — they either exit non-zero
 * (production) or return after logging a warning (development/test).
 */

export type SecretSpec = { name: string; minLength?: number };
export type IntegerSpec = { name: string; min?: number };

/**
 * Canonical list of Required_Secrets for the API_Service. Kept in sync with
 * the design document (Wave B / R1) and `.env.example`.
 */
export const API_REQUIRED_SECRETS: SecretSpec[] = [
  { name: "DATABASE_URL" },
  { name: "REDIS_URL" },
  { name: "JWT_ACCESS_SECRET", minLength: 32 },
  { name: "JWT_REFRESH_SECRET", minLength: 32 },
  { name: "INTERNAL_SERVICE_TOKEN", minLength: 16 },
  { name: "CORS_ORIGINS" },
];

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production";
}

function reportAndExit(env: NodeJS.ProcessEnv, label: string, offenders: string[]): void {
  if (offenders.length === 0) return;
  const names = offenders.join(", ");
  if (isProduction(env)) {
    process.stderr.write(`[bootstrap] Missing or invalid ${label}: ${names}\n`);
    process.exit(1);
    return;
  }
  process.stderr.write(
    `[bootstrap] WARN: Missing or invalid ${label}: ${names} (dev mode, continuing)\n`,
  );
}

/**
 * Verify that every Required_Secret in `specs` is present, non-empty (after
 * trimming whitespace) and — when `minLength` is set — at least that long.
 *
 * Production failure: write a single line listing every offender to stderr
 * and call `process.exit(1)`. Dev/test failure: write a warning line and
 * return.
 */
export function assertRequiredSecrets(specs: SecretSpec[], env: NodeJS.ProcessEnv): void {
  const offenders: string[] = [];
  for (const spec of specs) {
    const raw = env[spec.name];
    if (raw === undefined || raw === null || raw.trim().length === 0) {
      offenders.push(spec.name);
      continue;
    }
    if (spec.minLength !== undefined && raw.length < spec.minLength) {
      offenders.push(`${spec.name} (min length ${spec.minLength})`);
    }
  }
  reportAndExit(env, "Required_Secret(s)", offenders);
}

/**
 * Verify that every variable in `specs` parses to a positive integer
 * (no negatives, no zero, no NaN, no decimals). Production failure: exit
 * non-zero. Dev/test failure: warn and return.
 */
export function assertPositiveIntegers(specs: IntegerSpec[], env: NodeJS.ProcessEnv): void {
  const offenders: string[] = [];
  for (const spec of specs) {
    const raw = env[spec.name];
    if (raw === undefined || raw === null || raw.trim().length === 0) {
      offenders.push(spec.name);
      continue;
    }
    const trimmed = raw.trim();
    // Reject anything that is not a plain decimal-integer literal (no dots,
    // no exponents, no leading sign except an explicit positive int).
    if (!/^\d+$/.test(trimmed)) {
      offenders.push(`${spec.name} (not a positive integer: ${raw})`);
      continue;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      offenders.push(`${spec.name} (must be > 0)`);
      continue;
    }
    if (spec.min !== undefined && parsed < spec.min) {
      offenders.push(`${spec.name} (must be >= ${spec.min})`);
    }
  }
  reportAndExit(env, "positive integer Required_Secret(s)", offenders);
}
