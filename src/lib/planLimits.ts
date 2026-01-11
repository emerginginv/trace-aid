// Plan limits configuration - LIVE Stripe IDs

export type PlanKey = "solo" | "team" | "enterprise";

export interface PlanLimits {
  max_admin_users: number;
  storage_gb: number;
  name: string;
  price: number;
  unlimited_cases: boolean;
  unlimited_investigators: boolean;
  unlimited_vendors: boolean;
  plan_key: PlanKey;
}

export interface StorageAddon {
  storage_gb: number;
  name: string;
  price: number;
  price_id: string;
  product_id: string;
}

// Map Stripe product IDs to plan keys (LIVE)
export const PLAN_KEY_MAP: Record<string, PlanKey> = {
  "prod_Tm0HQ5XmPP0DwX": "solo",      // The Investigator
  "prod_Tm0HJQsiIJHUMu": "team",      // The Agency
  "prod_Tm0HLrO2c5CJS0": "enterprise", // The Enterprise
};

/**
 * Get the plan key from a Stripe product ID
 * Returns 'solo' as default for unknown or null product IDs
 */
export function getPlanKeyFromProductId(productId: string | null): PlanKey {
  if (!productId) return "solo";
  return PLAN_KEY_MAP[productId] || "solo";
}

// Main subscription plans (LIVE)
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // The Investigator - $12/month
  "prod_Tm0HQ5XmPP0DwX": {
    max_admin_users: 2,
    storage_gb: 50,
    name: "The Investigator",
    price: 12,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
    plan_key: "solo",
  },
  // The Agency - $39/month
  "prod_Tm0HJQsiIJHUMu": {
    max_admin_users: 5,
    storage_gb: 250,
    name: "The Agency",
    price: 39,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
    plan_key: "team",
  },
  // The Enterprise - $69/month
  "prod_Tm0HLrO2c5CJS0": {
    max_admin_users: 16,
    storage_gb: 500,
    name: "The Enterprise",
    price: 69,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
    plan_key: "enterprise",
  },
  // Free/No subscription fallback
  "free": {
    max_admin_users: 1,
    storage_gb: 5,
    name: "No Subscription",
    price: 0,
    unlimited_cases: false,
    unlimited_investigators: false,
    unlimited_vendors: false,
    plan_key: "solo",
  },
};

// Storage add-ons (LIVE)
export const STORAGE_ADDONS: Record<string, StorageAddon> = {
  "prod_Tm0HyA08LN2tww": {
    storage_gb: 500,
    name: "500GB Storage Add-on",
    price: 29,
    price_id: "price_1SoSHFRWPtpjyF4hS7aIZ1Sz",
    product_id: "prod_Tm0HyA08LN2tww",
  },
  "prod_Tm0IoM7iMpXsZz": {
    storage_gb: 1000,
    name: "1TB Storage Add-on",
    price: 49,
    price_id: "price_1SoSHSRWPtpjyF4hPA9BPkCV",
    product_id: "prod_Tm0IoM7iMpXsZz",
  },
};

// Pricing tiers for the billing page (LIVE)
export const PRICING_TIERS = [
  {
    name: "The Investigator",
    price: "$12",
    priceId: "price_1SoSGhRWPtpjyF4hTusfPPiG",
    productId: "prod_Tm0HQ5XmPP0DwX",
    features: [
      "2 Admin Users",
      "50GB Storage",
      "Unlimited Cases",
      "Unlimited Investigators",
      "Unlimited Vendors",
    ],
    maxAdminUsers: 2,
    storageGb: 50,
  },
  {
    name: "The Agency",
    price: "$39",
    priceId: "price_1SoSGsRWPtpjyF4hwra8HTaV",
    productId: "prod_Tm0HJQsiIJHUMu",
    features: [
      "5 Admin Users",
      "250GB Storage",
      "Unlimited Cases",
      "Unlimited Investigators",
      "Unlimited Vendors",
    ],
    maxAdminUsers: 5,
    storageGb: 250,
    popular: true,
  },
  {
    name: "The Enterprise",
    price: "$69",
    priceId: "price_1SoSH5RWPtpjyF4hXd6atI6G",
    productId: "prod_Tm0HLrO2c5CJS0",
    features: [
      "16 Admin Users",
      "500GB Storage",
      "Unlimited Cases",
      "Unlimited Investigators",
      "Unlimited Vendors",
    ],
    maxAdminUsers: 16,
    storageGb: 500,
  },
];

// Storage add-on tiers for billing page (LIVE)
export const STORAGE_ADDON_TIERS = [
  {
    name: "500GB Storage",
    price: "$29",
    priceId: "price_1SoSHFRWPtpjyF4hS7aIZ1Sz",
    productId: "prod_Tm0HyA08LN2tww",
    storageGb: 500,
  },
  {
    name: "1TB Storage",
    price: "$49",
    priceId: "price_1SoSHSRWPtpjyF4hPA9BPkCV",
    productId: "prod_Tm0IoM7iMpXsZz",
    storageGb: 1000,
  },
];

export function getPlanLimits(productId: string | null): PlanLimits {
  if (!productId) return PLAN_LIMITS.free;
  return PLAN_LIMITS[productId] || PLAN_LIMITS.free;
}

export function getStorageAddon(productId: string | null): StorageAddon | null {
  if (!productId) return null;
  return STORAGE_ADDONS[productId] || null;
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

export function getTotalStorage(basePlanId: string | null, storageAddonId: string | null): number {
  const basePlan = getPlanLimits(basePlanId);
  const addon = getStorageAddon(storageAddonId);
  return basePlan.storage_gb + (addon?.storage_gb || 0);
}
