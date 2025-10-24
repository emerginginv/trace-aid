// Plan limits configuration
// Ideally these should come from Stripe price metadata, but we have fallback values

export interface PlanLimits {
  max_users: number;
  storage_gb: number;
  name: string;
  price: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // Pro Plan - prod_TIFN9OVHNQ1tlK
  "prod_TIFN9OVHNQ1tlK": {
    max_users: 10,
    storage_gb: 50,
    name: "Pro Plan",
    price: 99,
  },
  // Standard Plan - prod_TIFNfVbkhFmIuB
  "prod_TIFNfVbkhFmIuB": {
    max_users: 10,
    storage_gb: 50,
    name: "Standard Plan", 
    price: 49,
  },
  // Free Plan (default)
  "free": {
    max_users: 2,
    storage_gb: 5,
    name: "Free Plan",
    price: 0,
  },
};

export function getPlanLimits(productId: string | null): PlanLimits {
  if (!productId) return PLAN_LIMITS.free;
  return PLAN_LIMITS[productId] || PLAN_LIMITS.free;
}

export function isTrialActive(trialEnd: string | null): boolean {
  if (!trialEnd) return false;
  return new Date(trialEnd) > new Date();
}

export function getTrialDaysRemaining(trialEnd: string | null): number {
  if (!trialEnd) return 0;
  const now = new Date();
  const end = new Date(trialEnd);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
