import { useState, useRef } from "react";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { useUserRole } from "@/hooks/useUserRole";
import VendorDashboard from "./VendorDashboard";
import { ActivityForm } from "@/components/case-detail/ActivityForm";
import { UpdateForm } from "@/components/case-detail/UpdateForm";
import { FinanceForm } from "@/components/case-detail/FinanceForm";
import { useOrganization } from "@/contexts/OrganizationContext";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { useDashboardData, DashboardTask, DashboardEvent, DashboardUpdate, DashboardExpense } from "@/hooks/useDashboardData";
import {
  DashboardStatsCards,
  DashboardActivitiesPanel,
  DashboardUpdatesPanel,
  DashboardExpensesPanel,
  DashboardCaseRequestsPanel,
} from "@/components/dashboard";
import { usePendingCaseRequests } from "@/hooks/usePendingCaseRequests";
import { usePermissions } from "@/hooks/usePermissions";
import { Briefcase, CheckCircle2, TrendingUp, Building2, Wallet, Receipt, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  useSetBreadcrumbs([{ label: "Dashboard" }]);

  const { isVendor, isAdmin, isManager, loading: roleLoading } = useUserRole();
  const { organization } = useOrganization();
  const { hasPermission } = usePermissions();

  // Pending case requests for dashboard widget
  const canViewRequests = hasPermission("view_case_requests");
  const { requests: pendingRequests, count: pendingRequestsCount, isLoading: requestsLoading } = usePendingCaseRequests(5);

  // Filter states for each container
  const [activitiesFilter, setActivitiesFilter] = useState<'my' | 'all'>('my');
  const [updatesFilter, setUpdatesFilter] = useState<'my' | 'all'>('my');
  const [expensesFilter, setExpensesFilter] = useState<'my' | 'all'>('my');

  const canViewAll = isAdmin || isManager;

  // Use the dashboard data hook
  const {
    dueTasks,
    upcomingEvents,
    updates,
    expenses,
    users,
    stats,
    financialSummary,
    updateTypePicklists,
    isLoading,
    handleTaskToggle,
  } = useDashboardData({
    tasksFilter: activitiesFilter,
    eventsFilter: activitiesFilter,
    updatesFilter,
    expensesFilter,
  });
  
  // Merge tasks and events into unified activities list
  const unifiedActivities = [...dueTasks.map(t => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    status: t.taskStatus,
    is_scheduled: false,
    completed: t.status === 'completed',
    caseId: t.caseId,
    assignedUserName: t.assignedUserName,
    activityData: t.activityData,
  })), ...upcomingEvents.map(e => ({
    id: e.id,
    title: e.title,
    dueDate: e.date,
    status: e.eventStatus,
    is_scheduled: true,
    completed: e.eventStatus === 'completed' || e.eventStatus === 'done',
    caseId: e.caseId,
    assignedUserName: e.assignedUserName,
    activityData: e.activityData,
  }))].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const [editingActivity, setEditingActivity] = useState<(DashboardTask | DashboardEvent) | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<DashboardUpdate | null>(null);
  const [editingExpense, setEditingExpense] = useState<DashboardExpense | null>(null);
  /**
   * @deprecated Since: 2026-01-15
   * Reason: Inline expand replaced with dedicated Update Details page
   * This state is kept for backwards compatibility but is no longer used
   * Remove after: Next major release
   */
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const isDuplicatingEventRef = useRef(false);

  // Stat cards configuration
  const statCards = [
    {
      title: "Open Cases",
      value: stats.openCases,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Closed Cases",
      value: stats.closedCases,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Total Cases",
      value: stats.totalCases,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Accounts",
      value: stats.totalAccounts,
      icon: Building2,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  // Show loading state while checking role or loading data
  if (roleLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  // Show vendor dashboard if user is a vendor
  if (isVendor) {
    return <VendorDashboard />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Overview + Financial Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border border-border rounded-lg p-4">
        {/* Stats Cards - Left Half */}
        <DashboardStatsCards stats={statCards} />

        {/* Financial Summary Card - Right Half */}
        <Card className="border-border bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 shadow-lg h-full">
          <CardHeader className="pb-3 pt-3">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-base font-semibold">Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Retainer Funds */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Client Retainers</span>
                </div>
                <p className="text-xl font-bold text-emerald-500">
                  ${financialSummary.totalRetainerFunds.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Outstanding Expenses */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Outstanding Expenses</span>
                </div>
                <p className="text-xl font-bold text-amber-500">
                  ${financialSummary.outstandingExpenses.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Unpaid Invoices */}
              <div className="p-3 rounded-xl bg-card/80 border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unpaid Invoices</span>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  ${financialSummary.unpaidInvoices.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid with Panel Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-border rounded-lg p-4">
        {/* Pending Case Requests - Top priority for admin/manager */}
        {canViewRequests && (
          <DashboardCaseRequestsPanel
            requests={pendingRequests}
            count={pendingRequestsCount}
            isLoading={requestsLoading}
          />
        )}

        {/* Unified Activities Panel */}
        <DashboardActivitiesPanel
          activities={unifiedActivities}
          filter={activitiesFilter}
          onFilterChange={setActivitiesFilter}
          canViewAll={canViewAll}
          onActivityToggle={handleTaskToggle}
          onActivityEdit={(activity) => setEditingActivity(activity as any)}
        />

        {/* Recent Updates */}
        <DashboardUpdatesPanel
          updates={updates}
          filter={updatesFilter}
          onFilterChange={setUpdatesFilter}
          canViewAll={canViewAll}
          onUpdateClick={(update) => setEditingUpdate(update)}
          expandedId={expandedUpdate}
          onExpandedChange={setExpandedUpdate}
          updateTypePicklists={updateTypePicklists}
        />

        {/* Recent Expenses */}
        <DashboardExpensesPanel
          expenses={expenses}
          filter={expensesFilter}
          onFilterChange={setExpensesFilter}
          canViewAll={canViewAll}
          onExpenseClick={(expense) => setEditingExpense(expense)}
          expandedId={expandedExpense}
          onExpandedChange={setExpandedExpense}
        />
      </div>

      {/* Edit Forms */}
      {editingActivity && (
        <ActivityForm
          caseId={(editingActivity as any).caseId}
          activityType={(editingActivity as any).is_scheduled ? "event" : "task"}
          users={users}
          open={!!editingActivity}
          onOpenChange={(open) => !open && setEditingActivity(null)}
          onSuccess={() => {
            setEditingActivity(null);
            window.location.reload();
          }}
          editingActivity={(editingActivity as any).activityData}
          organizationId={organization?.id || ""}
        />
      )}

      {editingUpdate && (
        <UpdateForm
          caseId={editingUpdate.caseId}
          open={!!editingUpdate}
          onOpenChange={(open) => !open && setEditingUpdate(null)}
          onSuccess={() => {
            setEditingUpdate(null);
            window.location.reload();
          }}
          editingUpdate={editingUpdate.updateData}
          organizationId={organization?.id || ""}
        />
      )}

      {editingExpense && (
        <FinanceForm
          caseId={editingExpense.caseId}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null);
            window.location.reload();
          }}
          editingFinance={editingExpense.financeData}
          organizationId={organization?.id || ""}
        />
      )}
    </div>
  );
};

export default Dashboard;
