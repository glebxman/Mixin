import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  API_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),
  INTERNAL_SERVICE_TOKEN: z.string().min(16, "INTERNAL_SERVICE_TOKEN must be at least 16 chars"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  API_PUBLIC_URL: z.string().url().optional(),
  // Deeper validation (`*` rejection, prod non-empty rule) lives in
  // `parseCorsOrigins` below; the schema only sanity-checks the raw string.
  CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    process.stderr.write("[bootstrap] Environment validation failed:\n");
    for (const issue of result.error.issues) {
      process.stderr.write(`  ${issue.path.join(".")}: ${issue.message}\n`);
    }
    process.exit(1);
  }
  return result.data;
}

/**
 * Normalize a raw `CORS_ORIGINS` value into a cleaned allowlist.
 *
 * Splits on commas, trims, drops empties. Throws if the list contains `"*"`.
 * In production, throws if the list is empty. In dev, an empty list is
 * allowed — the caller (see app.ts dev-fallback in B.3) substitutes the
 * documented localhost set.
 */
export function parseCorsOrigins(raw: string | undefined, isProd: boolean): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (list.includes("*")) {
    throw new Error("CORS_ORIGINS must not contain '*'");
  }
  if (isProd && list.length === 0) {
    throw new Error("CORS_ORIGINS must be a non-empty allowlist in production");
  }
  return list;
}
