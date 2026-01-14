import { Route } from "react-router-dom";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Onboarding } from "@/components/Onboarding";
import Dashboard from "@/pages/Dashboard";
import SupportConsole from "@/pages/SupportConsole";
import PlatformCompliance from "@/pages/PlatformCompliance";
import PlatformResilience from "@/pages/PlatformResilience";
import PlatformSecurity from "@/pages/PlatformSecurity";
import TrustCenterAdmin from "@/pages/TrustCenterAdmin";
import CustomerSuccess from "@/pages/CustomerSuccess";
import Marketplace from "@/pages/Marketplace";

/**
 * Routes for dashboard, onboarding, and platform administration.
 */
export const platformRoutes = (
  <>
    <Route
      path="/onboarding"
      element={
        <ProtectedRoute skipBillingGate>
          <Onboarding />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <RouteWrapper>
          <Dashboard />
        </RouteWrapper>
      }
    />
    <Route
      path="/support-console"
      element={
        <RouteWrapper>
          <SupportConsole />
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-compliance"
      element={
        <RouteWrapper>
          <PlatformCompliance />
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-resilience"
      element={
        <RouteWrapper>
          <PlatformResilience />
        </RouteWrapper>
      }
    />
    <Route
      path="/trust-admin"
      element={
        <RouteWrapper>
          <TrustCenterAdmin />
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-security"
      element={
        <RouteWrapper>
          <PlatformSecurity />
        </RouteWrapper>
      }
    />
    <Route
      path="/customer-success"
      element={
        <RouteWrapper>
          <CustomerSuccess />
        </RouteWrapper>
      }
    />
    <Route
      path="/marketplace"
      element={
        <ProtectedRoute>
          <Marketplace />
        </ProtectedRoute>
      }
    />
  </>
);

export default platformRoutes;
