import { Route } from "react-router-dom";
import { Suspense } from "react";
import { RouteWrapper } from "./RouteWrapper";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Analytics,
  CaseAnalytics,
  BudgetAnalytics,
  TimeExpenseAnalytics,
  ActivityAnalytics,
  SystemSecurityAnalytics,
} from "./lazyPages";

/**
 * Routes related to analytics and reporting.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const analyticsRoutes = (
  <>
    <Route
      path="/analytics"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Analytics />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/cases"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseAnalytics />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/finances"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <BudgetAnalytics />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/time-expense"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <TimeExpenseAnalytics />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/activities"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <ActivityAnalytics />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/system"
      element={
        <RouteWrapper requiredRole="admin">
          <Suspense fallback={<LazyLoadFallback />}>
            <SystemSecurityAnalytics />
          </Suspense>
        </RouteWrapper>
      }
    />
  </>
);

export default analyticsRoutes;
