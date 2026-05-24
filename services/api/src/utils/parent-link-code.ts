import { createHmac, timingSafeEqual } from "node:crypto";

const CODE_TTL_MS = 1000 * 60 * 60 * 24;

function secret() {
  return process.env.JWT_ACCESS_SECRET || "dev-parent-link-secret";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 18);
}

export function createParentLinkCode(studentId: string) {
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const payload = encode(JSON.stringify({ studentId, exp: expiresAt.getTime() }));
  return {
    code: `${payload}.${sign(payload)}`,
    expiresAt,
  };
}

export function verifyParentLinkCode(code: string) {
  const [payload, signature] = code.trim().split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const parsed = JSON.parse(decode(payload)) as { studentId?: string; exp?: number };
    if (!parsed.studentId || !parsed.exp || parsed.exp < Date.now()) return null;
    return { studentId: parsed.studentId };
  } catch {
    return null;
  }
}
