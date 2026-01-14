import { Route } from "react-router-dom";
import { RouteWrapper } from "./RouteWrapper";
import Analytics from "@/pages/Analytics";
import CaseAnalytics from "@/pages/CaseAnalytics";
import BudgetAnalytics from "@/pages/BudgetAnalytics";
import TimeExpenseAnalytics from "@/pages/TimeExpenseAnalytics";
import ActivityAnalytics from "@/pages/ActivityAnalytics";
import SystemSecurityAnalytics from "@/pages/SystemSecurityAnalytics";

/**
 * Routes related to analytics and reporting.
 */
export const analyticsRoutes = (
  <>
    <Route
      path="/analytics"
      element={
        <RouteWrapper blockVendors>
          <Analytics />
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/cases"
      element={
        <RouteWrapper blockVendors>
          <CaseAnalytics />
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/finances"
      element={
        <RouteWrapper blockVendors>
          <BudgetAnalytics />
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/time-expense"
      element={
        <RouteWrapper blockVendors>
          <TimeExpenseAnalytics />
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/activities"
      element={
        <RouteWrapper blockVendors>
          <ActivityAnalytics />
        </RouteWrapper>
      }
    />
    <Route
      path="/analytics/system"
      element={
        <RouteWrapper requiredRole="admin">
          <SystemSecurityAnalytics />
        </RouteWrapper>
      }
    />
  </>
);

export default analyticsRoutes;
