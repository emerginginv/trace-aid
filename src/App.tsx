import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { OrganizationProvider, useOrganization } from "./contexts/OrganizationContext";
import { OrganizationSwitcher } from "./components/OrganizationSwitcher";
import Auth from "./pages/Auth";
import { Onboarding } from "./components/Onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Calendar from "./pages/Calendar";
import Finance from "./pages/Finance";
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
import Admin from "./pages/Admin";
import UserProfile from "./pages/UserProfile";
import UserProfileDetail from "./pages/UserProfileDetail";
import Notifications from "./pages/Notifications";
import StyleGuide from "./pages/StyleGuide";
import PremiumShowcase from "./pages/PremiumShowcase";
import TestNotifications from "./pages/TestNotifications";
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

// Component to handle org switcher within the provider
function AppWithOrgSwitcher({ children }: { children: React.ReactNode }) {
  const { showOrgSwitcher, setShowOrgSwitcher, selectOrganization } = useOrganization();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  return (
    <>
      {children}
      {userId && (
        <OrganizationSwitcher
          open={showOrgSwitcher}
          onClose={() => setShowOrgSwitcher(false)}
          onSelect={selectOrganization}
          userId={userId}
        />
      )}
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
      >
        <OrganizationProvider>
          <BrowserRouter>
            <AppWithOrgSwitcher>
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
          path="/finance"
          element={
            <ProtectedRoute blockVendors={true}>
              <DashboardLayout>
                <Finance />
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
          path="/expenses"
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
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Admin />
              </DashboardLayout>
            </ProtectedRoute>
          }
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
        <Route path="*" element={<NotFound />} />
              </Routes>
            </AppWithOrgSwitcher>
          </BrowserRouter>
        </OrganizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
