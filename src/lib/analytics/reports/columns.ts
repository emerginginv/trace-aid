import { ReportColumn } from "./types";

// Case-related columns
export const caseColumns: Record<string, ReportColumn> = {
  case_number: {
    key: "case_number",
    header: "Case #",
    accessor: "case_number",
    sortable: true,
    width: "120px",
  },
  title: {
    key: "title",
    header: "Title",
    accessor: "title",
    sortable: true,
  },
  status: {
    key: "status",
    header: "Status",
    accessor: "status",
    format: "status",
    sortable: true,
    width: "120px",
  },
  created_at: {
    key: "created_at",
    header: "Created",
    accessor: "created_at",
    format: "date",
    sortable: true,
    width: "120px",
  },
  closed_at: {
    key: "closed_at",
    header: "Closed",
    accessor: "closed_at",
    format: "date",
    sortable: true,
    width: "120px",
  },
  account_name: {
    key: "account_name",
    header: "Client",
    accessor: (row) => (row.accounts as Record<string, unknown>)?.name || "—",
    sortable: true,
  },
  investigator_name: {
    key: "investigator_name",
    header: "Investigator",
    accessor: (row) => {
      const profile = row.case_manager as Record<string, unknown>;
      return profile?.full_name || "—";
    },
    sortable: false,
  },
  budget_dollars: {
    key: "budget_dollars",
    header: "Budget",
    accessor: "budget_dollars",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  budget_hours: {
    key: "budget_hours",
    header: "Budget Hours",
    accessor: "budget_hours",
    format: "hours",
    sortable: true,
    align: "right",
    width: "120px",
  },
};

// Finance-related columns
export const financeColumns: Record<string, ReportColumn> = {
  date: {
    key: "date",
    header: "Date",
    accessor: "date",
    format: "date",
    sortable: true,
    width: "120px",
  },
  description: {
    key: "description",
    header: "Description",
    accessor: "description",
    sortable: true,
  },
  finance_type: {
    key: "finance_type",
    header: "Type",
    accessor: "finance_type",
    sortable: true,
    width: "100px",
  },
  category: {
    key: "category",
    header: "Category",
    accessor: "category",
    sortable: true,
    width: "120px",
  },
  hours: {
    key: "hours",
    header: "Hours",
    accessor: "hours",
    format: "hours",
    sortable: true,
    align: "right",
    width: "100px",
  },
  hourly_rate: {
    key: "hourly_rate",
    header: "Rate",
    accessor: "hourly_rate",
    format: "currency",
    sortable: true,
    align: "right",
    width: "100px",
  },
  amount: {
    key: "amount",
    header: "Amount",
    accessor: "amount",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  invoiced: {
    key: "invoiced",
    header: "Invoiced",
    accessor: (row) => (row.invoiced ? "Yes" : "No"),
    sortable: true,
    width: "100px",
  },
  case_number_finance: {
    key: "case_number",
    header: "Case #",
    accessor: (row) => (row.cases as Record<string, unknown>)?.case_number || "—",
    sortable: false,
    width: "120px",
  },
};

// Activity-related columns
export const activityColumns: Record<string, ReportColumn> = {
  activity_title: {
    key: "title",
    header: "Title",
    accessor: "title",
    sortable: true,
  },
  activity_type: {
    key: "activity_type",
    header: "Type",
    accessor: "activity_type",
    sortable: true,
    width: "120px",
  },
  activity_status: {
    key: "status",
    header: "Status",
    accessor: "status",
    format: "status",
    sortable: true,
    width: "120px",
  },
  due_date: {
    key: "due_date",
    header: "Due Date",
    accessor: "due_date",
    format: "date",
    sortable: true,
    width: "120px",
  },
  completed: {
    key: "completed",
    header: "Completed",
    accessor: (row) => (row.completed ? "Yes" : "No"),
    sortable: true,
    width: "100px",
  },
  completed_at: {
    key: "completed_at",
    header: "Completed At",
    accessor: "completed_at",
    format: "datetime",
    sortable: true,
    width: "150px",
  },
  assigned_to: {
    key: "assigned_to",
    header: "Assigned To",
    accessor: (row) => {
      const profile = row.assigned_user as Record<string, unknown>;
      return profile?.full_name || "Unassigned";
    },
    sortable: false,
    width: "150px",
  },
  case_number_activity: {
    key: "case_number",
    header: "Case #",
    accessor: (row) => (row.cases as Record<string, unknown>)?.case_number || "—",
    sortable: false,
    width: "120px",
  },
};

// Update-related columns
export const updateColumns: Record<string, ReportColumn> = {
  update_title: {
    key: "title",
    header: "Title",
    accessor: "title",
    sortable: true,
  },
  update_type: {
    key: "update_type",
    header: "Type",
    accessor: "update_type",
    sortable: true,
    width: "120px",
  },
  update_created_at: {
    key: "created_at",
    header: "Created",
    accessor: "created_at",
    format: "datetime",
    sortable: true,
    width: "150px",
  },
  update_author: {
    key: "author",
    header: "Author",
    accessor: (row) => {
      const profile = row.profiles as Record<string, unknown>;
      return profile?.full_name || "Unknown";
    },
    sortable: false,
    width: "150px",
  },
  update_case_number: {
    key: "case_number",
    header: "Case #",
    accessor: (row) => (row.cases as Record<string, unknown>)?.case_number || "—",
    sortable: false,
    width: "120px",
  },
};

// Invoice-related columns
export const invoiceColumns: Record<string, ReportColumn> = {
  invoice_number: {
    key: "invoice_number",
    header: "Invoice #",
    accessor: "invoice_number",
    sortable: true,
    width: "120px",
  },
  invoice_date: {
    key: "date",
    header: "Date",
    accessor: "date",
    format: "date",
    sortable: true,
    width: "120px",
  },
  invoice_due_date: {
    key: "due_date",
    header: "Due Date",
    accessor: "due_date",
    format: "date",
    sortable: true,
    width: "120px",
  },
  invoice_total: {
    key: "total",
    header: "Total",
    accessor: "total",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  invoice_paid: {
    key: "total_paid",
    header: "Paid",
    accessor: "total_paid",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  invoice_balance: {
    key: "balance_due",
    header: "Balance",
    accessor: "balance_due",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  invoice_status: {
    key: "status",
    header: "Status",
    accessor: "status",
    format: "status",
    sortable: true,
    width: "100px",
  },
  invoice_case_number: {
    key: "case_number",
    header: "Case #",
    accessor: (row) => (row.cases as Record<string, unknown>)?.case_number || "—",
    sortable: false,
    width: "120px",
  },
};

// Budget-related columns
export const budgetColumns: Record<string, ReportColumn> = {
  budget_case_number: {
    key: "case_number",
    header: "Case #",
    accessor: "case_number",
    sortable: true,
    width: "120px",
  },
  budget_case_title: {
    key: "title",
    header: "Case Title",
    accessor: "title",
    sortable: true,
  },
  budget_authorized_dollars: {
    key: "budget_dollars",
    header: "Authorized $",
    accessor: "budget_dollars",
    format: "currency",
    sortable: true,
    align: "right",
    width: "130px",
  },
  budget_authorized_hours: {
    key: "budget_hours",
    header: "Auth. Hours",
    accessor: "budget_hours",
    format: "hours",
    sortable: true,
    align: "right",
    width: "120px",
  },
  budget_consumed_dollars: {
    key: "consumed_dollars",
    header: "Consumed $",
    accessor: "consumed_dollars",
    format: "currency",
    sortable: true,
    align: "right",
    width: "130px",
  },
  budget_consumed_hours: {
    key: "consumed_hours",
    header: "Used Hours",
    accessor: "consumed_hours",
    format: "hours",
    sortable: true,
    align: "right",
    width: "120px",
  },
  budget_remaining_dollars: {
    key: "remaining_dollars",
    header: "Remaining $",
    accessor: "remaining_dollars",
    format: "currency",
    sortable: true,
    align: "right",
    width: "130px",
  },
  budget_utilization: {
    key: "utilization",
    header: "Utilization",
    accessor: "utilization",
    format: "percentage",
    sortable: true,
    align: "right",
    width: "110px",
  },
};

// Budget adjustment columns
export const budgetAdjustmentColumns: Record<string, ReportColumn> = {
  adjustment_date: {
    key: "created_at",
    header: "Date",
    accessor: "created_at",
    format: "datetime",
    sortable: true,
    width: "150px",
  },
  adjustment_type: {
    key: "adjustment_type",
    header: "Type",
    accessor: "adjustment_type",
    sortable: true,
    width: "100px",
  },
  adjustment_previous: {
    key: "previous_value",
    header: "Previous",
    accessor: "previous_value",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  adjustment_new: {
    key: "new_value",
    header: "New Value",
    accessor: "new_value",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  adjustment_amount: {
    key: "adjustment_amount",
    header: "Change",
    accessor: "adjustment_amount",
    format: "currency",
    sortable: true,
    align: "right",
    width: "120px",
  },
  adjustment_reason: {
    key: "reason",
    header: "Reason",
    accessor: "reason",
    sortable: false,
  },
  adjustment_user: {
    key: "user",
    header: "Adjusted By",
    accessor: (row) => {
      const profile = row.profiles as Record<string, unknown>;
      return profile?.full_name || "Unknown";
    },
    sortable: false,
    width: "150px",
  },
  adjustment_case_number: {
    key: "case_number",
    header: "Case #",
    accessor: (row) => (row.cases as Record<string, unknown>)?.case_number || "—",
    sortable: false,
    width: "120px",
  },
};
