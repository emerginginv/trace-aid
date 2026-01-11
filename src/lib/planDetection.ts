import { PlanKey, PLAN_KEY_MAP } from "./planLimits";

/**
 * Check if a subscription tier or product ID represents an Enterprise plan.
 * Handles various naming conventions (enterprise, pro) and checks both tier name and product ID.
 */
export function isEnterprisePlan(
  subscriptionTier?: string | null,
  subscriptionProductId?: string | null
): boolean {
  // Check by product ID first (most reliable)
  if (subscriptionProductId && PLAN_KEY_MAP[subscriptionProductId] === "enterprise") {
    return true;
  }
  
  // Check by tier name (various formats used in the codebase)
  if (subscriptionTier) {
    const normalized = subscriptionTier.toLowerCase();
    return normalized === "enterprise" || normalized === "pro";
  }
  
  return false;
}

/**
 * Check if a subscription tier or product ID represents a Team plan or higher.
 */
export function isTeamOrHigherPlan(
  subscriptionTier?: string | null,
  subscriptionProductId?: string | null
): boolean {
  // Check by product ID first (most reliable)
  if (subscriptionProductId) {
    const planKey = PLAN_KEY_MAP[subscriptionProductId];
    return planKey === "team" || planKey === "enterprise";
  }
  
  // Check by tier name (various formats)
  if (subscriptionTier) {
    const normalized = subscriptionTier.toLowerCase();
    return ["team", "agency", "pro", "enterprise", "standard"].includes(normalized);
  }
  
  return false;
}

/**
 * Get the PlanKey from a tier name string.
 * Handles various naming conventions used across the application.
 */
export function getPlanKeyFromTier(tier?: string | null): PlanKey {
  if (!tier) return "solo";
  const normalized = tier.toLowerCase();
  
  if (normalized === "enterprise" || normalized === "pro") return "enterprise";
  if (normalized === "team" || normalized === "agency" || normalized === "standard") return "team";
  return "solo";
}
