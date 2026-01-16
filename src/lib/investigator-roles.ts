/**
 * Investigator Role Configuration
 * 
 * Centralized role definitions for extensibility.
 * To add new roles (e.g., lead, surveillance, analyst), simply add them here.
 * The UI will automatically adapt to display the new roles.
 */

export interface InvestigatorRoleConfig {
  key: string;
  label: string;
  shortLabel: string;
  isPrimary: boolean;  // Determines highlighted styling
  priority: number;    // Sort order (lower = higher priority)
}

export const INVESTIGATOR_ROLES: Record<string, InvestigatorRoleConfig> = {
  primary: {
    key: 'primary',
    label: 'Primary Investigator',
    shortLabel: 'Primary',
    isPrimary: true,
    priority: 0,
  },
  support: {
    key: 'support',
    label: 'Support Investigator',
    shortLabel: 'Support',
    isPrimary: false,
    priority: 1,
  },
  // Future roles can be added here:
  // lead: { key: 'lead', label: 'Lead Investigator', shortLabel: 'Lead', isPrimary: false, priority: 2 },
  // surveillance: { key: 'surveillance', label: 'Surveillance Specialist', shortLabel: 'Surveillance', isPrimary: false, priority: 3 },
  // analyst: { key: 'analyst', label: 'Analyst', shortLabel: 'Analyst', isPrimary: false, priority: 4 },
};

/**
 * Get full role configuration for a role key.
 * Falls back to a generated config for unknown roles.
 */
export function getRoleConfig(roleKey: string): InvestigatorRoleConfig {
  return INVESTIGATOR_ROLES[roleKey] ?? {
    key: roleKey,
    label: `${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} Investigator`,
    shortLabel: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
    isPrimary: false,
    priority: 99,
  };
}

/**
 * Get the display label for a role.
 */
export function getRoleLabel(roleKey: string): string {
  return getRoleConfig(roleKey).label;
}

/**
 * Get the short display label for a role.
 */
export function getRoleShortLabel(roleKey: string): string {
  return getRoleConfig(roleKey).shortLabel;
}

/**
 * Check if a role is considered "primary" (receives highlighted styling).
 */
export function isPrimaryRole(roleKey: string): boolean {
  return getRoleConfig(roleKey).isPrimary;
}

/**
 * Get sort priority for a role (lower = sorted first).
 */
export function getRolePriority(roleKey: string): number {
  return getRoleConfig(roleKey).priority;
}

/**
 * Get all available role keys.
 */
export function getAvailableRoles(): string[] {
  return Object.keys(INVESTIGATOR_ROLES);
}
