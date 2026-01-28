import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route, Navigate } from "react-router-dom";
import { Providers } from "@/components/providers";
import { GlobalLoadingIndicator } from "./components/ui/global-loading-indicator";
import { RouteTransitionDetector } from "./hooks/use-route-transition";
import Auth from "./pages/Auth";
import { Onboarding } from "./components/Onboarding";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import { CaseWizard } from "./components/case-wizard";
import Subjects from "./pages/Subjects";
import Activities from "./pages/Activities";
import Updates from "./pages/Updates";
import SubjectDetail from "./pages/SubjectDetail";
import Calendar from "./pages/Calendar";
import Finance from "./pages/Finance";
import AllExpenses from "./pages/AllExpenses";
import TimeEntries from "./pages/TimeEntries";
import TimeEntryDetail from "./pages/TimeEntryDetail";
import AllInvoices from "./pages/AllInvoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import UpdateDetail from "./pages/UpdateDetail";
import ExpenseDetail from "./pages/ExpenseDetail";
import Expenses from "./pages/Expenses";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import AccountEdit from "./pages/AccountEdit";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import ContactEdit from "./pages/ContactEdit";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import BillingReviewQueue from "./pages/BillingReviewQueue";
import ImportReview from "./pages/ImportReview";

import UserProfile from "./pages/UserProfile";
import UserProfileDetail from "./pages/UserProfileDetail";
import Notifications from "./pages/Notifications";
import StyleGuide from "./pages/StyleGuide";
import PremiumShowcase from "./pages/PremiumShowcase";
import TestNotifications from "./pages/TestNotifications";
import AttachmentAccess from "./pages/AttachmentAccess";
import AttachmentViewer from "./pages/AttachmentViewer";
import Analytics from "./pages/Analytics";
import CaseAnalytics from "./pages/CaseAnalytics";
import BudgetAnalytics from "./pages/BudgetAnalytics";
import TimeExpenseAnalytics from "./pages/TimeExpenseAnalytics";
import ActivityAnalytics from "./pages/ActivityAnalytics";
import SystemSecurityAnalytics from "./pages/SystemSecurityAnalytics";
import SupportConsole from "./pages/SupportConsole";
import PlatformCompliance from "./pages/PlatformCompliance";
import PlatformResilience from "./pages/PlatformResilience";
import PlatformSecurity from "./pages/PlatformSecurity";
import TrustCenter from "./pages/TrustCenter";
import TrustCenterAdmin from "./pages/TrustCenterAdmin";
import SecurityReport from "./pages/SecurityReport";
import StatusPage from "./pages/StatusPage";
import CustomerSuccess from "./pages/CustomerSuccess";
import Marketplace from "./pages/Marketplace";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import CaseUpdateDetail from "./pages/CaseUpdateDetail";
import NewCaseUpdate from "./pages/NewCaseUpdate";
import NewExpenseEntry from "./pages/NewExpenseEntry";
import EditExpenseEntry from "./pages/EditExpenseEntry";
import ExpenseEntryDetail from "./pages/ExpenseEntryDetail";
import CaseRequests from "./pages/CaseRequests";
import CaseRequestDetail from "./pages/CaseRequestDetail";
import NewCaseRequest from "./pages/NewCaseRequest";
import CaseRequestIntake from "./pages/CaseRequestIntake";
import HelpExport from "./pages/HelpExport";

const App = () => {
  return (
    <Providers>
      <GlobalLoadingIndicator />
      <RouteTransitionDetector />
      <Toaster />
      <Sonner />
      <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            {/* Public Trust Center - No auth required */}
            <Route path="/trust" element={<TrustCenter />} />
            {/* Public Status Page - No auth required */}
            <Route path="/status" element={<StatusPage />} />
            {/* Public Security Report Form - No auth required */}
            <Route path="/security/report" element={<SecurityReport />} />
            {/* Public Case Request Form - No auth required */}
            <Route path="/request/:slug" element={<CaseRequestIntake />} />
            {/* Help Export Utility */}
            <Route path="/help-export" element={<HelpExport />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute skipBillingGate>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            {/* Billing Route - Accessible even with pending payment */}
            <Route
              path="/billing"
              element={
                <ProtectedRoute skipBillingGate>
                  <DashboardLayout>
                    <Billing />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Accept Invite Route - handles invitation tokens */}
            <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Cases />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CaseWizard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Case Request Routes - must be before /cases/:id */}
        <Route
          path="/cases/requests"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <CaseRequests />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/requests/new"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <NewCaseRequest />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/requests/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <CaseRequestDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Case Update Routes - must be before /cases/:id */}
        <Route
          path="/cases/:caseId/updates/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NewCaseUpdate />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId/updates/:updateId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CaseUpdateDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Case Expense Routes - must be before /cases/:id */}
        <Route
          path="/cases/:caseId/expenses/new"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NewExpenseEntry />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId/expenses/:expenseId/edit"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EditExpenseEntry />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId/expenses/:expenseId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ExpenseEntryDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CaseDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId/subjects/:subjectId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SubjectDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Subjects />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Activities />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirects for backwards compatibility */}
        <Route path="/tasks" element={<Navigate to="/activities?filter=unscheduled" replace />} />
        <Route path="/events" element={<Navigate to="/activities?filter=scheduled" replace />} />
        <Route
          path="/updates"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Updates />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Calendar />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/retainers"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Finance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-entries"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <TimeEntries />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-entries/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <TimeEntryDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <AllExpenses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <AllInvoices />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirects from old URLs */}
        <Route path="/finance" element={<Navigate to="/retainers" replace />} />
        <Route path="/all-expenses" element={<Navigate to="/expenses" replace />} />
        <Route path="/all-invoices" element={<Navigate to="/invoices" replace />} />
        {/* Billing Review Queue - PART 8 */}
        <Route
          path="/billing-review"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <BillingReviewQueue />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/cases"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <CaseAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/finances"
          element={
            <ProtectedRoute blockVendors={true} blockInvestigators={true}>
              <DashboardLayout>
                <BudgetAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/time-expense"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <TimeExpenseAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/activities"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ActivityAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/system"
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout>
                <SystemSecurityAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <InvoiceDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/updates/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UpdateDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ExpenseDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-expenses"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Expenses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Accounts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <AccountDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/:id/edit"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <AccountEdit />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Contacts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ContactDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts/:id/edit"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ContactEdit />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={<Navigate to="/settings" replace />}
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute blockVendors={true}>
              <UserProfileDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={<Navigate to="/settings?tab=data-import" replace />}
        />
        <Route
          path="/import/review"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ImportReview />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<Navigate to="/settings" replace />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TestNotifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/style-guide" element={<StyleGuide />} />
        <Route path="/premium-showcase" element={<PremiumShowcase />} />
        <Route path="/attachment/:token" element={<AttachmentAccess />} />
        <Route
          path="/attachments/:id/view"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AttachmentViewer />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Support Console - Platform Staff Only */}
        <Route
          path="/support-console"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SupportConsole />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Platform Compliance - Platform Staff Only */}
        <Route
          path="/platform-compliance"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlatformCompliance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Platform Resilience - Disaster Recovery */}
        <Route
          path="/platform-resilience"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlatformResilience />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Trust Center Admin - Platform Staff Only */}
        <Route
          path="/trust-admin"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TrustCenterAdmin />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Platform Security - Vulnerability Management */}
        <Route
          path="/platform-security"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PlatformSecurity />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Customer Success - SLA & Health Monitoring */}
        <Route
          path="/customer-success"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CustomerSuccess />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        {/* Marketplace - Integration Directory */}
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />
        {/* Documentation - Testing Checklists & Guides */}
        <Route
          path="/documentation"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Documentation />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Providers>
  );
};

export default App;
