// Plan limits configuration
// Replace the product/price IDs with your actual Stripe IDs

export interface PlanLimits {
  max_admin_users: number;
  storage_gb: number;
  name: string;
  price: number;
  unlimited_cases: boolean;
  unlimited_investigators: boolean;
  unlimited_vendors: boolean;
}

export interface StorageAddon {
  storage_gb: number;
  name: string;
  price: number;
  price_id: string;
  product_id: string;
}

// Main subscription plans
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  // The Investigator - $12/month
  "prod_TagUwxglXyq7Ls": {
    max_admin_users: 2,
    storage_gb: 50,
    name: "The Investigator",
    price: 12,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
  },
  // The Agency - $39/month
  "prod_TagbsPhNweUFpe": {
    max_admin_users: 5,
    storage_gb: 250,
    name: "The Agency",
    price: 39,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
  },
  // The Enterprise - $69/month
  "prod_Tagc0lPxc1XjVC": {
    max_admin_users: 16,
    storage_gb: 500,
    name: "The Enterprise",
    price: 69,
    unlimited_cases: true,
    unlimited_investigators: true,
    unlimited_vendors: true,
  },
  // Free/No subscription fallback
  "free": {
    max_admin_users: 1,
    storage_gb: 5,
    name: "Free Trial",
    price: 0,
    unlimited_cases: false,
    unlimited_investigators: false,
    unlimited_vendors: false,
  },
};

// Storage add-ons (can be purchased in addition to main plan)
export const STORAGE_ADDONS: Record<string, StorageAddon> = {
  "prod_TagpgL61tfiDeS": {
    storage_gb: 500,
    name: "500GB Storage Add-on",
    price: 29,
    price_id: "price_1SdVRQRWPtpjyF4hkNZADRsE",
    product_id: "prod_TagpgL61tfiDeS",
  },
  "prod_TagqN9os8BWfbU": {
    storage_gb: 1000,
    name: "1TB Storage Add-on",
    price: 49,
    price_id: "price_1SdVScRWPtpjyF4hhvt5adQw",
    product_id: "prod_TagqN9os8BWfbU",
  },
};

// Pricing tiers for the billing page
export const PRICING_TIERS = [
  {
    name: "The Investigator",
    price: "$12",
    priceId: "price_1SdV7dRWPtpjyF4h7Qa9JdFr",
    productId: "prod_TagUwxglXyq7Ls",
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
    priceId: "price_1SdVEjRWPtpjyF4h3d5E7a7D",
    productId: "prod_TagbsPhNweUFpe",
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
    priceId: "price_1SdVFPRWPtpjyF4hp7WfLXFC",
    productId: "prod_Tagc0lPxc1XjVC",
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

// Storage add-on tiers for billing page
export const STORAGE_ADDON_TIERS = [
  {
    name: "500GB Storage",
    price: "$29",
    priceId: "price_1SdVRQRWPtpjyF4hkNZADRsE",
    productId: "prod_TagpgL61tfiDeS",
    storageGb: 500,
  },
  {
    name: "1TB Storage",
    price: "$49",
    priceId: "price_1SdVScRWPtpjyF4hhvt5adQw",
    productId: "prod_TagqN9os8BWfbU",
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
