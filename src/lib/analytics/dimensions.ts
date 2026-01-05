import type { Dimension, SourceTable } from "./types";

/**
 * Registry of all available dimensions for grouping analytics data
 */
export const DIMENSIONS: Record<string, Dimension> = {
  // ============= Case Dimensions =============
  "case.status": {
    id: "case.status",
    name: "Case Status",
    sourceField: "status",
    sourceTable: "cases",
    valueType: "string",
  },
  "case.account_id": {
    id: "case.account_id",
    name: "Client Account",
    sourceField: "account_id",
    sourceTable: "cases",
    valueType: "uuid",
  },
  "case.case_manager_id": {
    id: "case.case_manager_id",
    name: "Case Manager",
    sourceField: "case_manager_id",
    sourceTable: "cases",
    valueType: "uuid",
  },
  "case.user_id": {
    id: "case.user_id",
    name: "Created By",
    sourceField: "user_id",
    sourceTable: "cases",
    valueType: "uuid",
  },

  // ============= Time Dimensions =============
  "time.created_date": {
    id: "time.created_date",
    name: "Created Date",
    sourceField: "created_at",
    sourceTable: "cases",
    valueType: "date",
  },
  "time.created_month": {
    id: "time.created_month",
    name: "Created Month",
    sourceField: "created_at",
    sourceTable: "cases",
    valueType: "date",
  },
  "time.created_year": {
    id: "time.created_year",
    name: "Created Year",
    sourceField: "created_at",
    sourceTable: "cases",
    valueType: "date",
  },
  "time.closed_date": {
    id: "time.closed_date",
    name: "Closed Date",
    sourceField: "closed_at",
    sourceTable: "cases",
    valueType: "date",
  },

  // ============= Finance Dimensions =============
  "finance.type": {
    id: "finance.type",
    name: "Finance Type",
    sourceField: "finance_type",
    sourceTable: "case_finances",
    valueType: "string",
  },
  "finance.category": {
    id: "finance.category",
    name: "Expense Category",
    sourceField: "category",
    sourceTable: "case_finances",
    valueType: "string",
  },
  "finance.invoiced": {
    id: "finance.invoiced",
    name: "Invoiced Status",
    sourceField: "invoiced",
    sourceTable: "case_finances",
    valueType: "boolean",
  },
  "finance.case_id": {
    id: "finance.case_id",
    name: "Case",
    sourceField: "case_id",
    sourceTable: "case_finances",
    valueType: "uuid",
  },
  "finance.user_id": {
    id: "finance.user_id",
    name: "Billed By",
    sourceField: "user_id",
    sourceTable: "case_finances",
    valueType: "uuid",
  },

  // ============= Activity Dimensions =============
  "activity.type": {
    id: "activity.type",
    name: "Activity Type",
    sourceField: "activity_type",
    sourceTable: "case_activities",
    valueType: "string",
  },
  "activity.status": {
    id: "activity.status",
    name: "Activity Status",
    sourceField: "status",
    sourceTable: "case_activities",
    valueType: "string",
  },
  "activity.assigned_user_id": {
    id: "activity.assigned_user_id",
    name: "Assigned To",
    sourceField: "assigned_user_id",
    sourceTable: "case_activities",
    valueType: "uuid",
  },
  "activity.case_id": {
    id: "activity.case_id",
    name: "Case",
    sourceField: "case_id",
    sourceTable: "case_activities",
    valueType: "uuid",
  },
  "activity.event_subtype": {
    id: "activity.event_subtype",
    name: "Event Subtype",
    sourceField: "event_subtype",
    sourceTable: "case_activities",
    valueType: "string",
  },

  // ============= Update Dimensions =============
  "update.type": {
    id: "update.type",
    name: "Update Type",
    sourceField: "update_type",
    sourceTable: "case_updates",
    valueType: "string",
  },
  "update.user_id": {
    id: "update.user_id",
    name: "Author",
    sourceField: "user_id",
    sourceTable: "case_updates",
    valueType: "uuid",
  },
  "update.case_id": {
    id: "update.case_id",
    name: "Case",
    sourceField: "case_id",
    sourceTable: "case_updates",
    valueType: "uuid",
  },

  // ============= Invoice Dimensions =============
  "invoice.status": {
    id: "invoice.status",
    name: "Invoice Status",
    sourceField: "status",
    sourceTable: "invoices",
    valueType: "string",
  },
  "invoice.case_id": {
    id: "invoice.case_id",
    name: "Case",
    sourceField: "case_id",
    sourceTable: "invoices",
    valueType: "uuid",
  },

  // ============= Account Dimensions =============
  "account.industry": {
    id: "account.industry",
    name: "Industry",
    sourceField: "industry",
    sourceTable: "accounts",
    valueType: "string",
  },
  "account.state": {
    id: "account.state",
    name: "State",
    sourceField: "state",
    sourceTable: "accounts",
    valueType: "string",
  },

  // ============= Attachment Dimensions =============
  "attachment.file_type": {
    id: "attachment.file_type",
    name: "File Type",
    sourceField: "file_type",
    sourceTable: "case_attachments",
    valueType: "string",
  },
  "attachment.case_id": {
    id: "attachment.case_id",
    name: "Case",
    sourceField: "case_id",
    sourceTable: "case_attachments",
    valueType: "uuid",
  },

  // ============= Subject Dimensions =============
  "subject.type": {
    id: "subject.type",
    name: "Subject Type",
    sourceField: "subject_type",
    sourceTable: "case_subjects",
    valueType: "string",
  },
  "subject.is_primary": {
    id: "subject.is_primary",
    name: "Is Primary Subject",
    sourceField: "is_primary",
    sourceTable: "case_subjects",
    valueType: "boolean",
  },
};

/**
 * Get a dimension by ID
 */
export function getDimension(id: string): Dimension | undefined {
  return DIMENSIONS[id];
}

/**
 * Get all dimensions for a source table
 */
export function getDimensionsByTable(table: SourceTable): Dimension[] {
  return Object.values(DIMENSIONS).filter((d) => d.sourceTable === table);
}

/**
 * Get dimension IDs grouped by category
 */
export function getDimensionsByCategory(): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    case: [],
    time: [],
    finance: [],
    activity: [],
    update: [],
    invoice: [],
    account: [],
    attachment: [],
    subject: [],
  };

  for (const [id, _dim] of Object.entries(DIMENSIONS)) {
    const category = id.split(".")[0];
    if (categories[category]) {
      categories[category].push(id);
    }
  }

  return categories;
}
