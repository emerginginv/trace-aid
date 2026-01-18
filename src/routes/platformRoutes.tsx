import { Route } from "react-router-dom";
import { Suspense } from "react";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LazyLoadFallback, PageLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Onboarding,
  Dashboard,
  SupportConsole,
  PlatformCompliance,
  PlatformResilience,
  PlatformSecurity,
  TrustCenterAdmin,
  CustomerSuccess,
  Marketplace,
} from "./lazyPages";

/**
 * Routes for dashboard, onboarding, and platform administration.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const platformRoutes = (
  <>
    <Route
      path="/onboarding"
      element={
        <ProtectedRoute skipBillingGate>
          <Suspense fallback={<PageLoadFallback />}>
            <Onboarding />
          </Suspense>
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <Dashboard />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/support-console"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <SupportConsole />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-compliance"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <PlatformCompliance />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-resilience"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <PlatformResilience />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/trust-admin"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <TrustCenterAdmin />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/platform-security"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <PlatformSecurity />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/customer-success"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <CustomerSuccess />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/marketplace"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LazyLoadFallback />}>
            <Marketplace />
          </Suspense>
        </ProtectedRoute>
      }
    />
  </>
);

export default platformRoutes;
