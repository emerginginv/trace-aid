/**
 * CaseWyze Permission Constants
 * 
 * This file serves as the single source of truth for permission keys.
 * All permission checks in the application should reference these constants.
 * 
 * @see docs/permission-specification.md for full documentation
 */

// ============================================================================
// PERMISSION DOMAINS
// ============================================================================

export const PERMISSION_DOMAINS = {
  CASES: 'cases',
  UPDATES: 'updates',
  FILES: 'files',
  FINANCE: 'finance',
  ADMIN: 'admin',
  REPORTS: 'reports',
  ENTITIES: 'entities',
  INTAKE: 'intake',
  SYSTEM: 'system'
} as const;

export type PermissionDomain = typeof PERMISSION_DOMAINS[keyof typeof PERMISSION_DOMAINS];

// ============================================================================
// USER TYPES
// ============================================================================

export type PermissionUserType = 'employee' | 'client' | 'vendor' | 'vendor_contact';

// ============================================================================
// PERMISSION DEFINITION INTERFACE
// ============================================================================

export interface PermissionDefinition {
  key: string;
  displayName: string;
  domain: PermissionDomain;
  intent: string;
  userTypes: PermissionUserType[];
  dependencies: string[];
  description?: string;
}

// ============================================================================
// PERMISSION KEYS - Use these constants in hasPermission() calls
// ============================================================================

export const PERMISSION_KEYS = {
  // CASES Domain
  VIEW_ASSIGNED_CASES: 'view_assigned_cases',
  VIEW_ALL_CASES: 'view_all_cases',
  ADD_CASES: 'add_cases',
  EDIT_CASES: 'edit_cases',
  CLOSE_CASES: 'close_cases',
  REOPEN_CASES: 'reopen_cases',
  DELETE_CASES: 'delete_cases',
  ARCHIVE_CASES: 'archive_cases',
  ASSIGN_INVESTIGATORS: 'assign_investigators',
  MODIFY_CASE_STATUS: 'modify_case_status',
  EDIT_STATUS_DATES: 'edit_status_dates',
  VIEW_EXACT_STATUS: 'view_exact_status',

  // UPDATES Domain
  VIEW_UPDATES: 'view_updates',
  ADD_UPDATES: 'add_updates',
  EDIT_OWN_UPDATES: 'edit_own_updates',
  EDIT_UPDATES: 'edit_updates',
  DELETE_OWN_UPDATES: 'delete_own_updates',
  DELETE_UPDATES: 'delete_updates',

  // FILES Domain
  VIEW_FILES: 'view_files',
  UPLOAD_FILES: 'upload_files',
  DOWNLOAD_FILES: 'download_files',
  DELETE_FILES: 'delete_files',
  MANAGE_FOLDERS: 'manage_folders',

  // FINANCE Domain
  VIEW_OWN_EXPENSES: 'view_own_expenses',
  VIEW_CASE_FINANCIALS: 'view_case_financials',
  VIEW_ALL_FINANCIALS: 'view_all_financials',
  ADD_EXPENSES: 'add_expenses',
  ADD_TIME_ENTRIES: 'add_time_entries',
  EDIT_EXPENSES: 'edit_expenses',
  APPROVE_EXPENSES: 'approve_expenses',
  VIEW_INVOICES: 'view_invoices',
  CREATE_INVOICES: 'create_invoices',
  EDIT_INVOICES: 'edit_invoices',
  SEND_INVOICES: 'send_invoices',
  VOID_INVOICES: 'void_invoices',
  VIEW_BILLING_RATES: 'view_billing_rates',
  MANAGE_RATES: 'manage_rates',
  MODIFY_CASE_BUDGET: 'modify_case_budget',
  VIEW_RETAINERS: 'view_retainers',
  MANAGE_RETAINERS: 'manage_retainers',
  VIEW_MARGINS: 'view_margins',
  VIEW_BUDGET_VIOLATIONS: 'view_budget_violations',

  // ADMIN Domain
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MANAGE_COMPANY_SETTINGS: 'manage_company_settings',
  MANAGE_BILLING_SETTINGS: 'manage_billing_settings',
  DELETE_COMPANY_DATA: 'delete_company_data',
  VIEW_AUDIT_LOG: 'view_audit_log',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  IMPERSONATE_USERS: 'impersonate_users',
  MANAGE_API_KEYS: 'manage_api_keys',

  // REPORTS Domain
  VIEW_REPORTS: 'view_reports',
  GENERATE_REPORTS: 'generate_reports',
  DOWNLOAD_REPORTS: 'download_reports',
  VIEW_REPORT_TEMPLATES: 'view_report_templates',
  MANAGE_REPORT_TEMPLATES: 'manage_report_templates',

  // ENTITIES - Subjects
  VIEW_SUBJECTS: 'view_subjects',
  ADD_SUBJECTS: 'add_subjects',
  EDIT_SUBJECTS: 'edit_subjects',
  DELETE_SUBJECTS: 'delete_subjects',

  // ENTITIES - Contacts
  VIEW_CONTACTS: 'view_contacts',
  ADD_CONTACTS: 'add_contacts',
  EDIT_CONTACTS: 'edit_contacts',
  DELETE_CONTACTS: 'delete_contacts',

  // ENTITIES - Accounts
  VIEW_ACCOUNTS: 'view_accounts',
  ADD_ACCOUNTS: 'add_accounts',
  EDIT_ACCOUNTS: 'edit_accounts',
  DELETE_ACCOUNTS: 'delete_accounts',

  // ENTITIES - Activities
  VIEW_ACTIVITIES: 'view_activities',
  ADD_ACTIVITIES: 'add_activities',
  EDIT_ACTIVITIES: 'edit_activities',
  DELETE_ACTIVITIES: 'delete_activities',

  // INTAKE Domain
  VIEW_CASE_REQUESTS: 'view_case_requests',
  APPROVE_CASE_REQUESTS: 'approve_case_requests',
  DELETE_CASE_REQUESTS: 'delete_case_requests',
  MANAGE_CASE_REQUEST_FORMS: 'manage_case_request_forms',

  // SYSTEM Domain
  VIEW_CALENDAR: 'view_calendar',
  VIEW_NOTIFICATIONS: 'view_notifications',
  VIEW_BILLING: 'view_billing',
} as const;

export type PermissionKey = typeof PERMISSION_KEYS[keyof typeof PERMISSION_KEYS];

// ============================================================================
// PERMISSION ALIASES - For backwards compatibility
// ============================================================================

/**
 * Maps deprecated permission keys to their normalized equivalents.
 * Used by hasPermission() to support legacy code during migration.
 */
export const PERMISSION_ALIASES: Record<string, string> = {
  // Attachments → Files
  'view_attachments': 'view_files',
  'add_attachments': 'upload_files',
  'edit_attachments': 'upload_files', // No direct equivalent
  'delete_attachments': 'delete_files',

  // Finances → Specific permissions
  'view_finances': 'view_case_financials',
  'add_finances': 'add_expenses',
  'edit_finances': 'edit_expenses',
  'delete_finances': 'delete_expenses',

  // Cases → Assigned cases
  'view_cases': 'view_assigned_cases',
};

// ============================================================================
// PERMISSION REGISTRY - Full definitions
// ============================================================================

export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // -------------------------------------------------------------------------
  // CASES Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_ASSIGNED_CASES]: {
    key: PERMISSION_KEYS.VIEW_ASSIGNED_CASES,
    displayName: 'View Assigned Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'See cases the user is directly assigned to',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [],
  },
  [PERMISSION_KEYS.VIEW_ALL_CASES]: {
    key: PERMISSION_KEYS.VIEW_ALL_CASES,
    displayName: 'View All Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'See all cases in the organization regardless of assignment',
    userTypes: ['employee'],
    dependencies: [],
  },
  [PERMISSION_KEYS.ADD_CASES]: {
    key: PERMISSION_KEYS.ADD_CASES,
    displayName: 'Create Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Create new case records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.EDIT_CASES]: {
    key: PERMISSION_KEYS.EDIT_CASES,
    displayName: 'Edit Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Modify case details including subjects, dates, and properties',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.CLOSE_CASES]: {
    key: PERMISSION_KEYS.CLOSE_CASES,
    displayName: 'Close Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Transition case status to Closed or Cancelled',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
  },
  [PERMISSION_KEYS.REOPEN_CASES]: {
    key: PERMISSION_KEYS.REOPEN_CASES,
    displayName: 'Reopen Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Transition closed cases back to active status',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
  },
  [PERMISSION_KEYS.DELETE_CASES]: {
    key: PERMISSION_KEYS.DELETE_CASES,
    displayName: 'Delete Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Permanently delete case records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
    description: 'Admin only - permanently removes case and all related data',
  },
  [PERMISSION_KEYS.ARCHIVE_CASES]: {
    key: PERMISSION_KEYS.ARCHIVE_CASES,
    displayName: 'Archive Cases',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Move cases to archived state',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
  },
  [PERMISSION_KEYS.ASSIGN_INVESTIGATORS]: {
    key: PERMISSION_KEYS.ASSIGN_INVESTIGATORS,
    displayName: 'Assign Investigators',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Add or remove investigators from case assignments',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
  },
  [PERMISSION_KEYS.MODIFY_CASE_STATUS]: {
    key: PERMISSION_KEYS.MODIFY_CASE_STATUS,
    displayName: 'Modify Status',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Change case workflow status within allowed transitions',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CASES],
  },
  [PERMISSION_KEYS.EDIT_STATUS_DATES]: {
    key: PERMISSION_KEYS.EDIT_STATUS_DATES,
    displayName: 'Edit Status Dates',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'Modify historical status transition timestamps',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.MODIFY_CASE_STATUS],
    description: 'Admin only - allows backdating status changes',
  },
  [PERMISSION_KEYS.VIEW_EXACT_STATUS]: {
    key: PERMISSION_KEYS.VIEW_EXACT_STATUS,
    displayName: 'View Exact Status',
    domain: PERMISSION_DOMAINS.CASES,
    intent: 'See specific internal status vs high-level category only',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },

  // -------------------------------------------------------------------------
  // UPDATES Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_UPDATES]: {
    key: PERMISSION_KEYS.VIEW_UPDATES,
    displayName: 'View Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'See case updates (subject to Access Group filtering)',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.ADD_UPDATES]: {
    key: PERMISSION_KEYS.ADD_UPDATES,
    displayName: 'Create Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'Post new updates to cases',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_UPDATES],
  },
  [PERMISSION_KEYS.EDIT_OWN_UPDATES]: {
    key: PERMISSION_KEYS.EDIT_OWN_UPDATES,
    displayName: 'Edit Own Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'Modify updates the user created',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.ADD_UPDATES],
  },
  [PERMISSION_KEYS.EDIT_UPDATES]: {
    key: PERMISSION_KEYS.EDIT_UPDATES,
    displayName: 'Edit All Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'Modify any update (requires higher rank than creator)',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_OWN_UPDATES],
    description: 'Edit any update in the organization',
  },
  [PERMISSION_KEYS.DELETE_OWN_UPDATES]: {
    key: PERMISSION_KEYS.DELETE_OWN_UPDATES,
    displayName: 'Delete Own Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'Remove updates the user created',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.ADD_UPDATES],
  },
  [PERMISSION_KEYS.DELETE_UPDATES]: {
    key: PERMISSION_KEYS.DELETE_UPDATES,
    displayName: 'Delete All Updates',
    domain: PERMISSION_DOMAINS.UPDATES,
    intent: 'Remove any update regardless of creator',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.DELETE_OWN_UPDATES],
    description: 'Delete any update in the organization',
  },

  // -------------------------------------------------------------------------
  // FILES Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_FILES]: {
    key: PERMISSION_KEYS.VIEW_FILES,
    displayName: 'View Files',
    domain: PERMISSION_DOMAINS.FILES,
    intent: 'See file attachments (subject to Access Group filtering)',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.UPLOAD_FILES]: {
    key: PERMISSION_KEYS.UPLOAD_FILES,
    displayName: 'Upload Files',
    domain: PERMISSION_DOMAINS.FILES,
    intent: 'Add files to cases',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_FILES],
  },
  [PERMISSION_KEYS.DOWNLOAD_FILES]: {
    key: PERMISSION_KEYS.DOWNLOAD_FILES,
    displayName: 'Download Files',
    domain: PERMISSION_DOMAINS.FILES,
    intent: 'Download file attachments from cases',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_FILES],
  },
  [PERMISSION_KEYS.DELETE_FILES]: {
    key: PERMISSION_KEYS.DELETE_FILES,
    displayName: 'Delete Files',
    domain: PERMISSION_DOMAINS.FILES,
    intent: 'Remove files from cases',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.UPLOAD_FILES],
  },
  [PERMISSION_KEYS.MANAGE_FOLDERS]: {
    key: PERMISSION_KEYS.MANAGE_FOLDERS,
    displayName: 'Manage Folders',
    domain: PERMISSION_DOMAINS.FILES,
    intent: 'Create, rename, and delete folder structure',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_FILES],
  },

  // -------------------------------------------------------------------------
  // FINANCE Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_OWN_EXPENSES]: {
    key: PERMISSION_KEYS.VIEW_OWN_EXPENSES,
    displayName: 'View Own Expenses',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See expenses the user submitted',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [],
  },
  [PERMISSION_KEYS.VIEW_CASE_FINANCIALS]: {
    key: PERMISSION_KEYS.VIEW_CASE_FINANCIALS,
    displayName: 'View Case Financials',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See all expenses and time entries on assigned cases',
    userTypes: ['employee', 'client'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.VIEW_ALL_FINANCIALS]: {
    key: PERMISSION_KEYS.VIEW_ALL_FINANCIALS,
    displayName: 'View All Financials',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See financials across all cases in organization',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
  },
  [PERMISSION_KEYS.ADD_EXPENSES]: {
    key: PERMISSION_KEYS.ADD_EXPENSES,
    displayName: 'Submit Expenses',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Create new expense entries',
    userTypes: ['employee', 'vendor'],
    dependencies: [PERMISSION_KEYS.VIEW_OWN_EXPENSES],
  },
  [PERMISSION_KEYS.ADD_TIME_ENTRIES]: {
    key: PERMISSION_KEYS.ADD_TIME_ENTRIES,
    displayName: 'Submit Time',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Create time tracking entries',
    userTypes: ['employee', 'vendor'],
    dependencies: [PERMISSION_KEYS.VIEW_OWN_EXPENSES],
  },
  [PERMISSION_KEYS.EDIT_EXPENSES]: {
    key: PERMISSION_KEYS.EDIT_EXPENSES,
    displayName: 'Edit Expenses',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Modify expense entries',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.ADD_EXPENSES],
  },
  [PERMISSION_KEYS.APPROVE_EXPENSES]: {
    key: PERMISSION_KEYS.APPROVE_EXPENSES,
    displayName: 'Approve Expenses',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Approve pending expenses for invoicing',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
    description: 'Manager+ only',
  },
  [PERMISSION_KEYS.VIEW_INVOICES]: {
    key: PERMISSION_KEYS.VIEW_INVOICES,
    displayName: 'View Invoices',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See invoice records and details',
    userTypes: ['employee', 'client'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
  },
  [PERMISSION_KEYS.CREATE_INVOICES]: {
    key: PERMISSION_KEYS.CREATE_INVOICES,
    displayName: 'Create Invoices',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Generate new invoices from approved items',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_INVOICES],
  },
  [PERMISSION_KEYS.EDIT_INVOICES]: {
    key: PERMISSION_KEYS.EDIT_INVOICES,
    displayName: 'Edit Invoices',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Modify invoice details before sending',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.CREATE_INVOICES],
  },
  [PERMISSION_KEYS.SEND_INVOICES]: {
    key: PERMISSION_KEYS.SEND_INVOICES,
    displayName: 'Send Invoices',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Deliver invoices to clients',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_INVOICES],
  },
  [PERMISSION_KEYS.VOID_INVOICES]: {
    key: PERMISSION_KEYS.VOID_INVOICES,
    displayName: 'Void Invoices',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Cancel and void invoices',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_INVOICES],
    description: 'Admin only',
  },
  [PERMISSION_KEYS.VIEW_BILLING_RATES]: {
    key: PERMISSION_KEYS.VIEW_BILLING_RATES,
    displayName: 'View Billing Rates',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See hourly rates and fee schedules',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Manager+ only - contains sensitive pricing data',
  },
  [PERMISSION_KEYS.MANAGE_RATES]: {
    key: PERMISSION_KEYS.MANAGE_RATES,
    displayName: 'Manage Rates',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Create and edit billing rate configurations',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_BILLING_RATES],
    description: 'Admin only',
  },
  [PERMISSION_KEYS.MODIFY_CASE_BUDGET]: {
    key: PERMISSION_KEYS.MODIFY_CASE_BUDGET,
    displayName: 'Modify Budget',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Set or change case budget limits',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
  },
  [PERMISSION_KEYS.VIEW_RETAINERS]: {
    key: PERMISSION_KEYS.VIEW_RETAINERS,
    displayName: 'View Retainers',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See retainer fund balances',
    userTypes: ['employee', 'client'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
  },
  [PERMISSION_KEYS.MANAGE_RETAINERS]: {
    key: PERMISSION_KEYS.MANAGE_RETAINERS,
    displayName: 'Manage Retainers',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'Add, edit, or apply retainer funds',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_RETAINERS],
  },
  [PERMISSION_KEYS.VIEW_MARGINS]: {
    key: PERMISSION_KEYS.VIEW_MARGINS,
    displayName: 'View Margins',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See profit margin and cost data',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ALL_FINANCIALS],
    description: 'Admin only - contains sensitive business metrics',
  },
  [PERMISSION_KEYS.VIEW_BUDGET_VIOLATIONS]: {
    key: PERMISSION_KEYS.VIEW_BUDGET_VIOLATIONS,
    displayName: 'View Budget Violations',
    domain: PERMISSION_DOMAINS.FINANCE,
    intent: 'See budget cap violation alerts',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_FINANCIALS],
  },

  // -------------------------------------------------------------------------
  // ADMIN Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.MANAGE_USERS]: {
    key: PERMISSION_KEYS.MANAGE_USERS,
    displayName: 'Manage Users',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Create, edit, deactivate user accounts',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only',
  },
  [PERMISSION_KEYS.MANAGE_ROLES]: {
    key: PERMISSION_KEYS.MANAGE_ROLES,
    displayName: 'Manage Roles',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Create and edit role definitions',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.MANAGE_USERS],
    description: 'Super Admin only',
  },
  [PERMISSION_KEYS.MANAGE_PERMISSIONS]: {
    key: PERMISSION_KEYS.MANAGE_PERMISSIONS,
    displayName: 'Manage Permissions',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Toggle permission settings for roles',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only',
  },
  [PERMISSION_KEYS.MANAGE_COMPANY_SETTINGS]: {
    key: PERMISSION_KEYS.MANAGE_COMPANY_SETTINGS,
    displayName: 'Manage Settings',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Modify organization-wide settings',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only',
  },
  [PERMISSION_KEYS.MANAGE_BILLING_SETTINGS]: {
    key: PERMISSION_KEYS.MANAGE_BILLING_SETTINGS,
    displayName: 'Manage Billing',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Configure payment methods and subscription',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Super Admin only',
  },
  [PERMISSION_KEYS.DELETE_COMPANY_DATA]: {
    key: PERMISSION_KEYS.DELETE_COMPANY_DATA,
    displayName: 'Delete Company Data',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Perform organization-level data deletion',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Super Admin only - destructive operation',
  },
  [PERMISSION_KEYS.VIEW_AUDIT_LOG]: {
    key: PERMISSION_KEYS.VIEW_AUDIT_LOG,
    displayName: 'View Audit Log',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Access system audit trail and event history',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only',
  },
  [PERMISSION_KEYS.MANAGE_INTEGRATIONS]: {
    key: PERMISSION_KEYS.MANAGE_INTEGRATIONS,
    displayName: 'Manage Integrations',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Configure third-party service connections',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only',
  },
  [PERMISSION_KEYS.IMPERSONATE_USERS]: {
    key: PERMISSION_KEYS.IMPERSONATE_USERS,
    displayName: 'Impersonate Users',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Act as another user for support purposes',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.MANAGE_USERS],
    description: 'Super Admin only - logged for security',
  },
  [PERMISSION_KEYS.MANAGE_API_KEYS]: {
    key: PERMISSION_KEYS.MANAGE_API_KEYS,
    displayName: 'Manage API Keys',
    domain: PERMISSION_DOMAINS.ADMIN,
    intent: 'Create and revoke API access keys',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Super Admin only',
  },

  // -------------------------------------------------------------------------
  // REPORTS Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_REPORTS]: {
    key: PERMISSION_KEYS.VIEW_REPORTS,
    displayName: 'View Reports',
    domain: PERMISSION_DOMAINS.REPORTS,
    intent: 'Access generated report library',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.GENERATE_REPORTS]: {
    key: PERMISSION_KEYS.GENERATE_REPORTS,
    displayName: 'Generate Reports',
    domain: PERMISSION_DOMAINS.REPORTS,
    intent: 'Create new case reports from templates',
    userTypes: ['employee', 'client'],
    dependencies: [PERMISSION_KEYS.VIEW_REPORTS],
  },
  [PERMISSION_KEYS.DOWNLOAD_REPORTS]: {
    key: PERMISSION_KEYS.DOWNLOAD_REPORTS,
    displayName: 'Download Reports',
    domain: PERMISSION_DOMAINS.REPORTS,
    intent: 'Download report files in various formats',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_REPORTS],
  },
  [PERMISSION_KEYS.VIEW_REPORT_TEMPLATES]: {
    key: PERMISSION_KEYS.VIEW_REPORT_TEMPLATES,
    displayName: 'View Templates',
    domain: PERMISSION_DOMAINS.REPORTS,
    intent: 'Access report template library',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_REPORTS],
  },
  [PERMISSION_KEYS.MANAGE_REPORT_TEMPLATES]: {
    key: PERMISSION_KEYS.MANAGE_REPORT_TEMPLATES,
    displayName: 'Manage Templates',
    domain: PERMISSION_DOMAINS.REPORTS,
    intent: 'Create and edit report templates',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_REPORT_TEMPLATES],
    description: 'Admin+ only',
  },

  // -------------------------------------------------------------------------
  // ENTITIES - Subjects
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_SUBJECTS]: {
    key: PERMISSION_KEYS.VIEW_SUBJECTS,
    displayName: 'View Subjects',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'See subject details including PII',
    userTypes: ['employee', 'client'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.ADD_SUBJECTS]: {
    key: PERMISSION_KEYS.ADD_SUBJECTS,
    displayName: 'Add Subjects',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Create new subject records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_SUBJECTS],
  },
  [PERMISSION_KEYS.EDIT_SUBJECTS]: {
    key: PERMISSION_KEYS.EDIT_SUBJECTS,
    displayName: 'Edit Subjects',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Modify subject information',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_SUBJECTS],
  },
  [PERMISSION_KEYS.DELETE_SUBJECTS]: {
    key: PERMISSION_KEYS.DELETE_SUBJECTS,
    displayName: 'Delete Subjects',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Remove subject records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_SUBJECTS],
  },

  // -------------------------------------------------------------------------
  // ENTITIES - Contacts
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_CONTACTS]: {
    key: PERMISSION_KEYS.VIEW_CONTACTS,
    displayName: 'View Contacts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'See contact information',
    userTypes: ['employee', 'client'],
    dependencies: [],
  },
  [PERMISSION_KEYS.ADD_CONTACTS]: {
    key: PERMISSION_KEYS.ADD_CONTACTS,
    displayName: 'Add Contacts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Create new contact records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CONTACTS],
  },
  [PERMISSION_KEYS.EDIT_CONTACTS]: {
    key: PERMISSION_KEYS.EDIT_CONTACTS,
    displayName: 'Edit Contacts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Modify contact information',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CONTACTS],
  },
  [PERMISSION_KEYS.DELETE_CONTACTS]: {
    key: PERMISSION_KEYS.DELETE_CONTACTS,
    displayName: 'Delete Contacts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Remove contact records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_CONTACTS],
  },

  // -------------------------------------------------------------------------
  // ENTITIES - Accounts
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_ACCOUNTS]: {
    key: PERMISSION_KEYS.VIEW_ACCOUNTS,
    displayName: 'View Accounts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'See client account information',
    userTypes: ['employee'],
    dependencies: [],
  },
  [PERMISSION_KEYS.ADD_ACCOUNTS]: {
    key: PERMISSION_KEYS.ADD_ACCOUNTS,
    displayName: 'Add Accounts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Create new account records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ACCOUNTS],
  },
  [PERMISSION_KEYS.EDIT_ACCOUNTS]: {
    key: PERMISSION_KEYS.EDIT_ACCOUNTS,
    displayName: 'Edit Accounts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Modify account information',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ACCOUNTS],
  },
  [PERMISSION_KEYS.DELETE_ACCOUNTS]: {
    key: PERMISSION_KEYS.DELETE_ACCOUNTS,
    displayName: 'Delete Accounts',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Remove account records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_ACCOUNTS],
  },

  // -------------------------------------------------------------------------
  // ENTITIES - Activities
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_ACTIVITIES]: {
    key: PERMISSION_KEYS.VIEW_ACTIVITIES,
    displayName: 'View Activities',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'See scheduled activities and tasks',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_ASSIGNED_CASES],
  },
  [PERMISSION_KEYS.ADD_ACTIVITIES]: {
    key: PERMISSION_KEYS.ADD_ACTIVITIES,
    displayName: 'Add Activities',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Create new activities',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ACTIVITIES],
  },
  [PERMISSION_KEYS.EDIT_ACTIVITIES]: {
    key: PERMISSION_KEYS.EDIT_ACTIVITIES,
    displayName: 'Edit Activities',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Modify activity details',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_ACTIVITIES],
  },
  [PERMISSION_KEYS.DELETE_ACTIVITIES]: {
    key: PERMISSION_KEYS.DELETE_ACTIVITIES,
    displayName: 'Delete Activities',
    domain: PERMISSION_DOMAINS.ENTITIES,
    intent: 'Remove activity records',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.EDIT_ACTIVITIES],
  },

  // -------------------------------------------------------------------------
  // INTAKE Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_CASE_REQUESTS]: {
    key: PERMISSION_KEYS.VIEW_CASE_REQUESTS,
    displayName: 'View Case Requests',
    domain: PERMISSION_DOMAINS.INTAKE,
    intent: 'See submitted case requests',
    userTypes: ['employee'],
    dependencies: [],
  },
  [PERMISSION_KEYS.APPROVE_CASE_REQUESTS]: {
    key: PERMISSION_KEYS.APPROVE_CASE_REQUESTS,
    displayName: 'Approve Requests',
    domain: PERMISSION_DOMAINS.INTAKE,
    intent: 'Accept or decline case requests',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_REQUESTS],
  },
  [PERMISSION_KEYS.DELETE_CASE_REQUESTS]: {
    key: PERMISSION_KEYS.DELETE_CASE_REQUESTS,
    displayName: 'Delete Requests',
    domain: PERMISSION_DOMAINS.INTAKE,
    intent: 'Permanently remove case requests',
    userTypes: ['employee'],
    dependencies: [PERMISSION_KEYS.VIEW_CASE_REQUESTS],
  },
  [PERMISSION_KEYS.MANAGE_CASE_REQUEST_FORMS]: {
    key: PERMISSION_KEYS.MANAGE_CASE_REQUEST_FORMS,
    displayName: 'Manage Forms',
    domain: PERMISSION_DOMAINS.INTAKE,
    intent: 'Create and configure public intake forms',
    userTypes: ['employee'],
    dependencies: [],
  },

  // -------------------------------------------------------------------------
  // SYSTEM Domain
  // -------------------------------------------------------------------------
  [PERMISSION_KEYS.VIEW_CALENDAR]: {
    key: PERMISSION_KEYS.VIEW_CALENDAR,
    displayName: 'View Calendar',
    domain: PERMISSION_DOMAINS.SYSTEM,
    intent: 'Access calendar view of activities',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [PERMISSION_KEYS.VIEW_ACTIVITIES],
  },
  [PERMISSION_KEYS.VIEW_NOTIFICATIONS]: {
    key: PERMISSION_KEYS.VIEW_NOTIFICATIONS,
    displayName: 'View Notifications',
    domain: PERMISSION_DOMAINS.SYSTEM,
    intent: 'See notification center',
    userTypes: ['employee', 'client', 'vendor', 'vendor_contact'],
    dependencies: [],
    description: 'System-level permission - rarely restricted',
  },
  [PERMISSION_KEYS.VIEW_BILLING]: {
    key: PERMISSION_KEYS.VIEW_BILLING,
    displayName: 'View Billing',
    domain: PERMISSION_DOMAINS.SYSTEM,
    intent: 'Access subscription and payment info',
    userTypes: ['employee'],
    dependencies: [],
    description: 'Admin+ only - subscription management',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolves a permission key, handling aliases for backwards compatibility.
 * Use this in hasPermission() to support legacy code.
 */
export function resolvePermissionKey(key: string): string {
  return PERMISSION_ALIASES[key] || key;
}

/**
 * Gets the permission definition for a key.
 * Returns undefined if the key is not recognized.
 */
export function getPermissionDefinition(key: string): PermissionDefinition | undefined {
  const resolvedKey = resolvePermissionKey(key);
  return PERMISSIONS[resolvedKey];
}

/**
 * Gets all permissions for a specific domain.
 */
export function getPermissionsByDomain(domain: PermissionDomain): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter(p => p.domain === domain);
}

/**
 * Gets all permissions available to a specific user type.
 */
export function getPermissionsForUserType(userType: PermissionUserType): PermissionDefinition[] {
  return Object.values(PERMISSIONS).filter(p => p.userTypes.includes(userType));
}

/**
 * Checks if a permission key is deprecated (has an alias).
 */
export function isDeprecatedPermission(key: string): boolean {
  return key in PERMISSION_ALIASES;
}

/**
 * Gets all dependencies for a permission (recursive).
 */
export function getAllDependencies(key: string): string[] {
  const permission = getPermissionDefinition(key);
  if (!permission) return [];
  
  const allDeps = new Set<string>();
  const queue = [...permission.dependencies];
  
  while (queue.length > 0) {
    const depKey = queue.shift()!;
    if (!allDeps.has(depKey)) {
      allDeps.add(depKey);
      const depPermission = getPermissionDefinition(depKey);
      if (depPermission) {
        queue.push(...depPermission.dependencies);
      }
    }
  }
  
  return Array.from(allDeps);
}
