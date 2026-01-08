// Column definitions for import functionality
// This file provides column mapping metadata for CSV imports

export interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

export interface EntityColumnDefinitions {
  entityType: string;
  columns: ColumnDefinition[];
}

export const IMPORT_COLUMN_DEFINITIONS: EntityColumnDefinitions[] = [
  {
    entityType: "accounts",
    columns: [
      { key: "name", label: "Account Name", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip_code", label: "Zip Code" },
      { key: "industry", label: "Industry" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    entityType: "contacts",
    columns: [
      { key: "first_name", label: "First Name", required: true },
      { key: "last_name", label: "Last Name", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip_code", label: "Zip Code" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    entityType: "cases",
    columns: [
      { key: "title", label: "Case Title", required: true },
      { key: "case_number", label: "Case Number", required: true },
      { key: "status", label: "Status" },
      { key: "description", label: "Description" },
      { key: "due_date", label: "Due Date" },
      { key: "reference_number", label: "Reference Number" },
      { key: "budget_hours", label: "Budget Hours" },
      { key: "budget_dollars", label: "Budget Dollars" },
    ],
  },
  {
    entityType: "case_subjects",
    columns: [
      { key: "name", label: "Subject Name", required: true },
      { key: "subject_type", label: "Subject Type", required: true },
      { key: "is_primary", label: "Is Primary" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    entityType: "case_updates",
    columns: [
      { key: "title", label: "Update Title", required: true },
      { key: "description", label: "Description" },
      { key: "update_type", label: "Update Type" },
    ],
  },
  {
    entityType: "case_activities",
    columns: [
      { key: "title", label: "Activity Title", required: true },
      { key: "activity_type", label: "Activity Type", required: true },
      { key: "description", label: "Description" },
      { key: "due_date", label: "Due Date" },
      { key: "status", label: "Status" },
    ],
  },
  {
    entityType: "case_finances",
    columns: [
      { key: "description", label: "Description", required: true },
      { key: "finance_type", label: "Finance Type", required: true },
      { key: "amount", label: "Amount", required: true },
      { key: "hours", label: "Hours" },
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
    ],
  },
];

export function getColumnDefinitions(entityType: string): ColumnDefinition[] {
  const entity = IMPORT_COLUMN_DEFINITIONS.find(e => e.entityType === entityType);
  return entity?.columns || [];
}

export function getRequiredColumns(entityType: string): string[] {
  const columns = getColumnDefinitions(entityType);
  return columns.filter(c => c.required).map(c => c.key);
}
