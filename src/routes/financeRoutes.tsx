import { Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Finance,
  AllExpenses,
  TimeEntries,
  TimeEntryDetail,
  AllInvoices,
  InvoiceDetail,
  ExpenseDetail,
  Expenses,
  Billing,
  BillingReviewQueue,
} from "./lazyPages";

/**
 * Routes related to finances, billing, and invoicing.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const financeRoutes = (
  <>
    {/* Billing Route - Accessible even with pending payment */}
    <Route
      path="/billing"
      element={
        <ProtectedRoute skipBillingGate>
          <DashboardLayout>
            <Suspense fallback={<LazyLoadFallback />}>
              <Billing />
            </Suspense>
          </DashboardLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/retainers"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Finance />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/time-entries"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <TimeEntries />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/time-entries/:id"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <TimeEntryDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/expenses"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <AllExpenses />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/expenses/:id"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <ExpenseDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/my-expenses"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <Expenses />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/invoices"
      element={
        <RouteWrapper blockVendors blockInvestigators>
          <Suspense fallback={<LazyLoadFallback />}>
            <AllInvoices />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/invoices/:id"
      element={
        <RouteWrapper blockVendors blockInvestigators>
          <Suspense fallback={<LazyLoadFallback />}>
            <InvoiceDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/billing-review"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <BillingReviewQueue />
          </Suspense>
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
