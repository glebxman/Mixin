import type { FastifyInstance } from "fastify";
import {
  CREDIT_COSTS,
  CREDIT_PACK_OPTIONS,
  CREDIT_PLAN_BASE_PRICE_USD,
  QUEST_PLAN_PRICE_USD,
  SUBSCRIPTION_LIMITS,
} from "@edtech/config";

/**
 * SECURITY: Self-upgrade убран. Пользователь не может сам поменять
 * себе план — это привело бы к получению PREMIUM без оплаты.
 *
 * Смена плана происходит:
 * - либо через webhook от платёжного провайдера (Payme/Uzum)
 * - либо ручно через SUPER_ADMIN (см. отдельный admin endpoint, TBD)
 */
export async function subscriptionsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.authUser!.userId },
        select: { subscriptionPlan: true },
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }
      const plan = user.subscriptionPlan;
      const today = new Date().toISOString().slice(0, 10);
      const creditsKey = `ai:credits:${request.authUser!.userId}:${today}`;
      const rawCredits = await app.redis.get(creditsKey);
      const remainingCredits = rawCredits !== null
        ? parseInt(rawCredits, 10)
        : SUBSCRIPTION_LIMITS[plan].dailyCredits;

      return {
        success: true,
        data: {
          plan,
          remainingCredits,
          limits: SUBSCRIPTION_LIMITS[plan],
          creditCosts: CREDIT_COSTS,
          plans: {
            free: {
              id: "FREE",
              priceUsd: 0,
              dailyCredits: SUBSCRIPTION_LIMITS.FREE.dailyCredits,
              testsEnabled: true,
              questsEnabled: false,
            },
            credits: {
              id: "BASIC",
              priceFromUsd: CREDIT_PLAN_BASE_PRICE_USD,
              dailyCredits: SUBSCRIPTION_LIMITS.BASIC.dailyCredits,
              bonusCreditOptions: CREDIT_PACK_OPTIONS,
              testsEnabled: true,
              questsEnabled: false,
            },
            quests: {
              id: "PREMIUM",
              priceUsd: QUEST_PLAN_PRICE_USD,
              dailyCredits: SUBSCRIPTION_LIMITS.PREMIUM.dailyCredits,
              bonusCreditOptions: CREDIT_PACK_OPTIONS,
              testsEnabled: true,
              questsEnabled: true,
            },
          },
        },
      };
    },
  );
}
