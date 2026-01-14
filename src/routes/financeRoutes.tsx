import { Route, Navigate } from "react-router-dom";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import Finance from "@/pages/Finance";
import AllExpenses from "@/pages/AllExpenses";
import TimeEntries from "@/pages/TimeEntries";
import TimeEntryDetail from "@/pages/TimeEntryDetail";
import AllInvoices from "@/pages/AllInvoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import ExpenseDetail from "@/pages/ExpenseDetail";
import Expenses from "@/pages/Expenses";
import Billing from "@/pages/Billing";
import BillingReviewQueue from "@/pages/BillingReviewQueue";

/**
 * Routes related to finances, billing, and invoicing.
 */
export const financeRoutes = (
  <>
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
    <Route
      path="/retainers"
      element={
        <RouteWrapper blockVendors>
          <Finance />
        </RouteWrapper>
      }
    />
    <Route
      path="/time-entries"
      element={
        <RouteWrapper blockVendors>
          <TimeEntries />
        </RouteWrapper>
      }
    />
    <Route
      path="/time-entries/:id"
      element={
        <RouteWrapper blockVendors>
          <TimeEntryDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/expenses"
      element={
        <RouteWrapper blockVendors>
          <AllExpenses />
        </RouteWrapper>
      }
    />
    <Route
      path="/expenses/:id"
      element={
        <RouteWrapper blockVendors>
          <ExpenseDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/my-expenses"
      element={
        <RouteWrapper>
          <Expenses />
        </RouteWrapper>
      }
    />
    <Route
      path="/invoices"
      element={
        <RouteWrapper blockVendors>
          <AllInvoices />
        </RouteWrapper>
      }
    />
    <Route
      path="/invoices/:id"
      element={
        <RouteWrapper blockVendors>
          <InvoiceDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/billing-review"
      element={
        <RouteWrapper blockVendors>
          <BillingReviewQueue />
        </RouteWrapper>
      }
    />
    {/* Redirects from old URLs */}
    <Route path="/finance" element={<Navigate to="/retainers" replace />} />
    <Route path="/all-expenses" element={<Navigate to="/expenses" replace />} />
    <Route path="/all-invoices" element={<Navigate to="/invoices" replace />} />
  </>
);

export default financeRoutes;
