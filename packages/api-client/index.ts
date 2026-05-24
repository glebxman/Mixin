/**
 * @edtech/api-client — единый HTTP-клиент для всех фронтов.
 *
 * Архитектура:
 *   src/http.ts     — axios-инстанс, CSRF, 401-обработчик
 *   src/env.ts      — VITE_*-URL'ы и safeRedirectPath
 *   src/{auth,student,ai,parent,admin}.ts — доменные клиенты и типы
 *
 * SECURITY:
 *   • withCredentials: true — токены живут только в HttpOnly cookies.
 *   • CSRF double-submit pattern — токен из /api/auth/csrf в X-CSRF-Token.
 *   • 401-интерсептор делает редирект на login.
 */

export { api, setUnauthorizedHandler } from "./src/http";
export {
  API_URL,
  STUDENT_URL,
  PARENT_URL,
  ADMIN_URL,
  ROLE_URLS,
  safeRedirectPath,
} from "./src/env";

export {
  authApi,
  subscriptionApi,
  type AuthUser,
  type AuthResult,
  type SubscriptionInfo,
} from "./src/auth";

export {
  studentApi,
  type StudentMe,
  type SubjectScore,
  type WeeklyActivity,
  type Recommendation,
  type LearningPlanItem,
  type CareerInsight,
  type QuestStrategy,
  type IntegrationStatus,
  type AiModuleStatus,
  type StudentAnalytics,
  type Quest,
} from "./src/student";

export {
  aiApi,
  type ChatAttachment,
  type ChatActions,
  type ChatStateInfo,
  type ChatResponse,
  type ChatStreamDone,
  type ChatStreamHandlers,
  type GeneratedImage,
  type StoredChatImage,
  type StoredChatMessage,
  type SessionListItem,
  type SessionDetail,
} from "./src/ai";

export {
  parentApi,
  type ParentChild,
  type ParentChildOverview,
} from "./src/parent";

export { adminApi, type AdminOverview, type AdminUser } from "./src/admin";

export { getPlanLabelKey } from "./src/plans";

export type * from "@edtech/types";
