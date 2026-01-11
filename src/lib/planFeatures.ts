// Canonical feature list for plan comparison matrix
import { PlanKey } from "./planLimits";

export type FeatureCategory =
  | "core_case_management"
  | "collaboration_access"
  | "ai_features"
  | "evidence_attachments"
  | "branding_customization"
  | "billing_admin"
  | "security_compliance";

export interface PlanFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  description?: string;
  solo: boolean;
  team: boolean;
  enterprise: boolean;
}

export const FEATURE_CATEGORIES: Record<FeatureCategory, string> = {
  core_case_management: "Core Case Management",
  collaboration_access: "Collaboration & Access",
  ai_features: "AI Features",
  evidence_attachments: "Evidence & Attachments",
  branding_customization: "Branding & Customization",
  billing_admin: "Billing & Admin",
  security_compliance: "Security & Compliance",
};

// Canonical list of all features with explicit availability per plan
// RULE: Higher tiers MUST include all features of lower tiers
export const PLAN_FEATURES: PlanFeature[] = [
  // Core Case Management - All plans get these
  {
    id: "case_creation",
    name: "Case creation & management",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "subjects",
    name: "Subjects (People, Vehicles, Locations, Items)",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "updates_events",
    name: "Updates, Events & Attachments",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "case_number_customization",
    name: "Case number customization",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "unlimited_cases",
    name: "Unlimited cases",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "unlimited_investigators",
    name: "Unlimited investigators",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "unlimited_vendors",
    name: "Unlimited vendors",
    category: "core_case_management",
    solo: true,
    team: true,
    enterprise: true,
  },

  // Collaboration & Access
  {
    id: "admin_users_2",
    name: "2 Admin users",
    category: "collaboration_access",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "admin_users_5",
    name: "5 Admin users",
    category: "collaboration_access",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "admin_users_16",
    name: "16 Admin users",
    category: "collaboration_access",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "role_permissions",
    name: "Role-based permissions",
    category: "collaboration_access",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "multi_user_collab",
    name: "Multi-user collaboration",
    category: "collaboration_access",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "team_management",
    name: "Team management",
    category: "collaboration_access",
    solo: false,
    team: true,
    enterprise: true,
  },

  // AI Features
  {
    id: "ai_update_summaries",
    name: "AI-generated update summaries",
    category: "ai_features",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "ai_case_summaries",
    name: "AI case summaries",
    category: "ai_features",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "ai_assisted_reports",
    name: "AI-assisted reports",
    category: "ai_features",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "ai_quality_checks",
    name: "AI quality checks",
    category: "ai_features",
    solo: false,
    team: true,
    enterprise: true,
  },

  // Evidence & Attachments
  {
    id: "storage_50gb",
    name: "50GB Storage",
    category: "evidence_attachments",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "storage_250gb",
    name: "250GB Storage",
    category: "evidence_attachments",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "storage_500gb",
    name: "500GB Storage",
    category: "evidence_attachments",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "storage_addons",
    name: "Storage add-ons available",
    category: "evidence_attachments",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "evidence_linking",
    name: "Evidence linking",
    category: "evidence_attachments",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "document_templates",
    name: "Document templates",
    category: "evidence_attachments",
    solo: true,
    team: true,
    enterprise: true,
  },

  // Branding & Customization
  {
    id: "custom_subdomain",
    name: "Custom subdomain",
    category: "branding_customization",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "branded_login",
    name: "Branded login page",
    category: "branding_customization",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "org_branding",
    name: "Organization branding",
    category: "branding_customization",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "custom_domain",
    name: "Custom domain",
    category: "branding_customization",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "white_label",
    name: "White-label options",
    category: "branding_customization",
    solo: false,
    team: false,
    enterprise: true,
  },

  // Billing & Admin
  {
    id: "billing_portal",
    name: "Stripe billing portal",
    category: "billing_admin",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "usage_reporting",
    name: "Usage reporting",
    category: "billing_admin",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "advanced_analytics",
    name: "Advanced analytics",
    category: "billing_admin",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "api_access",
    name: "API access",
    category: "billing_admin",
    solo: false,
    team: true,
    enterprise: true,
  },
  {
    id: "priority_support",
    name: "Priority support",
    category: "billing_admin",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "dedicated_success",
    name: "Dedicated success manager",
    category: "billing_admin",
    solo: false,
    team: false,
    enterprise: true,
  },

  // Security & Compliance
  {
    id: "audit_logs",
    name: "Audit logs",
    category: "security_compliance",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "data_export",
    name: "Data export",
    category: "security_compliance",
    solo: true,
    team: true,
    enterprise: true,
  },
  {
    id: "sso_oidc_saml",
    name: "SSO (OIDC/SAML)",
    category: "security_compliance",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "scim_provisioning",
    name: "SCIM user provisioning",
    category: "security_compliance",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "role_mapping",
    name: "SSO role mapping",
    category: "security_compliance",
    solo: false,
    team: false,
    enterprise: true,
  },
  {
    id: "access_reviews",
    name: "Access reviews",
    category: "security_compliance",
    solo: false,
    team: false,
    enterprise: true,
  },
];

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(): Record<FeatureCategory, PlanFeature[]> {
  const grouped: Record<FeatureCategory, PlanFeature[]> = {
    core_case_management: [],
    collaboration_access: [],
    ai_features: [],
    evidence_attachments: [],
    branding_customization: [],
    billing_admin: [],
    security_compliance: [],
  };

  for (const feature of PLAN_FEATURES) {
    grouped[feature.category].push(feature);
  }

  return grouped;
}

/**
 * Check if a specific feature is available for a plan
 */
export function getFeatureAvailability(featureId: string, planKey: PlanKey): boolean {
  const feature = PLAN_FEATURES.find((f) => f.id === featureId);
  if (!feature) return false;

  switch (planKey) {
    case "solo":
      return feature.solo;
    case "team":
      return feature.team;
    case "enterprise":
      return feature.enterprise;
    default:
      return false;
  }
}

/**
 * Validate that higher tiers include all features of lower tiers
 * This should be run in development to catch configuration errors
 */
export function validateFeatureInheritance(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const feature of PLAN_FEATURES) {
    // If Solo has it, Team and Enterprise must have it
    if (feature.solo && !feature.team) {
      errors.push(`Feature inheritance violation: ${feature.id} - Solo has it but Team doesn't`);
    }
    if (feature.solo && !feature.enterprise) {
      errors.push(`Feature inheritance violation: ${feature.id} - Solo has it but Enterprise doesn't`);
    }
    // If Team has it, Enterprise must have it
    if (feature.team && !feature.enterprise) {
      errors.push(`Feature inheritance violation: ${feature.id} - Team has it but Enterprise doesn't`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run validation in development
if (import.meta.env.DEV) {
  const validation = validateFeatureInheritance();
  if (!validation.valid) {
    console.error("Feature inheritance validation failed:", validation.errors);
  }
}
