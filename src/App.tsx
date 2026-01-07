import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { GlobalLoadingProvider } from "./contexts/GlobalLoadingContext";
import { GlobalLoadingIndicator } from "./components/ui/global-loading-indicator";
import { RouteTransitionDetector } from "./hooks/use-route-transition";
import { BreadcrumbProvider } from "./contexts/BreadcrumbContext";
import Auth from "./pages/Auth";
import { Onboarding } from "./components/Onboarding";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Calendar from "./pages/Calendar";
import Finance from "./pages/Finance";
import AllExpenses from "./pages/AllExpenses";
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
import ReportAnalytics from "./pages/ReportAnalytics";
import SystemSecurityAnalytics from "./pages/SystemSecurityAnalytics";
import ReportsHub from "./pages/reports/index";
import ReportViewer from "./pages/reports/ReportViewer";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingProvider>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange
        >
          <OrganizationProvider>
            <BreadcrumbProvider>
              <BrowserRouter>
              <GlobalLoadingIndicator />
              <RouteTransitionDetector />
              <Toaster />
              <Sonner />
              <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
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
            <ProtectedRoute blockVendors={true}>
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
          path="/analytics/reports"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ReportAnalytics />
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
        {/* Reports Hub */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ReportsHub />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:reportId"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <ReportViewer />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </BreadcrumbProvider>
          </OrganizationProvider>
        </ThemeProvider>
      </GlobalLoadingProvider>
    </QueryClientProvider>
  );
};

export default App;
