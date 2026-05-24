import type { Role } from "@edtech/types";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_AI_URL?: string;
    readonly VITE_STUDENT_URL?: string;
    readonly VITE_PARENT_URL?: string;
    readonly VITE_ADMIN_URL?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

function readEnv(key: string, fallback: string): string {
  try {
    const env = (import.meta as ImportMeta | undefined)?.env;
    return (env?.[key as keyof ImportMetaEnv] as string | undefined) ?? fallback;
  } catch {
    return fallback;
  }
}

export const API_URL = readEnv("VITE_API_URL", "http://localhost:3001");
export const STUDENT_URL = readEnv("VITE_STUDENT_URL", "http://localhost:3100");
export const PARENT_URL = readEnv("VITE_PARENT_URL", "http://localhost:3200");
export const ADMIN_URL = readEnv("VITE_ADMIN_URL", "http://localhost:3400");

export const ROLE_URLS: Record<Role, string> = {
  STUDENT: STUDENT_URL,
  PARENT: PARENT_URL,
  SUPER_ADMIN: ADMIN_URL,
};

/**
 * Защита от open redirect.
 * Принимаем только относительные пути со "/" и без "//".
 */
export function safeRedirectPath(input: unknown, fallback = "/"): string {
  if (typeof input !== "string") return fallback;
  if (
    !input.startsWith("/") ||
    input.startsWith("//") ||
    input.startsWith("/\\")
  ) {
    return fallback;
  }
  return input;
}
