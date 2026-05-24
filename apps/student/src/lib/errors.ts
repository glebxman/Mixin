/**
 * Helpers для распознавания типичных ошибок API на фронте.
 *
 * Серверные сообщения могут быть локализованы на разные языки,
 * поэтому полагаемся либо на HTTP-код (402), либо на устойчивые
 * подстроки ("credits"), либо на типовой код ошибки в будущем.
 */

const CREDIT_ERROR_PATTERNS: ReadonlyArray<string | RegExp> = [
  /credits/i,
  /402/,
  "Недостаточно кредитов",
  "Sizning kreditlaringiz tugadi",
  "out of credits",
];

export function isInsufficientCreditsError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return false;
  return CREDIT_ERROR_PATTERNS.some((pattern) =>
    typeof pattern === "string" ? message.includes(pattern) : pattern.test(message),
  );
}
