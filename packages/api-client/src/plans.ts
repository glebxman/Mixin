/**
 * Subscription plan helpers shared across student & admin frontends.
 *
 * Lives in @edtech/api-client because every consumer of `subscriptionPlan`
 * already imports types from here, and we want a single mapping from
 * server-side plan IDs (FREE/BASIC/PREMIUM) to i18n keys.
 *
 * Usage:
 *   import { getPlanLabelKey } from "@edtech/api-client";
 *   const label = t(getPlanLabelKey(plan));
 */

import type { SubscriptionPlan } from "@edtech/types";

/**
 * Returns the i18n key for a subscription plan label.
 * Defaults to the FREE label when the input is missing or unknown.
 */
export function getPlanLabelKey(plan: SubscriptionPlan | string | undefined | null): string {
  if (plan === "PREMIUM") return "plans.quests";
  if (plan === "BASIC") return "plans.credits";
  return "plans.free";
}
