import { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";

interface RouteWrapperProps {
  children: ReactNode;
  skipBillingGate?: boolean;
  blockVendors?: boolean;
  requiredRole?: "admin" | "investigator" | "manager" | "vendor";
  withLayout?: boolean;
}

/**
 * Wrapper component that combines ProtectedRoute with optional DashboardLayout.
 * Reduces boilerplate in route definitions.
 */
export function RouteWrapper({
  children,
  skipBillingGate = false,
  blockVendors = false,
  requiredRole,
  withLayout = true,
}: RouteWrapperProps) {
  return (
    <ProtectedRoute
      skipBillingGate={skipBillingGate}
      blockVendors={blockVendors}
      requiredRole={requiredRole}
    >
      {withLayout ? <DashboardLayout>{children}</DashboardLayout> : children}
    </ProtectedRoute>
  );
}

export default RouteWrapper;
