// Dashboard data types - centralized type definitions
export interface DashboardTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  taskStatus: string;
  caseId: string;
  activityData: Record<string, unknown>;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export interface DashboardEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  eventStatus: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  caseId: string;
  activityData: Record<string, unknown>;
}

export interface DashboardUpdate {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  updateType: string;
  authorId: string;
  authorName: string | null;
  caseId: string;
  updateData: Record<string, unknown>;
}

export interface DashboardExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
  submittedByName: string | null;
  caseId: string;
  financeData: Record<string, unknown>;
}

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  openCases: number;
  closedCases: number;
  totalContacts: number;
  totalAccounts: number;
}

export interface FinancialSummary {
  totalRetainerFunds: number;
  outstandingExpenses: number;
  unpaidInvoices: number;
}

export interface OrgUser {
  id: string;
  email: string;
  full_name: string | null;
}

export interface UseDashboardDataOptions {
  tasksFilter: 'my' | 'all';
  eventsFilter: 'my' | 'all';
  updatesFilter: 'my' | 'all';
  expensesFilter: 'my' | 'all';
}
