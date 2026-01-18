import { Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Settings,
  ImportReview,
  Accounts,
  AccountDetail,
  AccountEdit,
  Contacts,
  ContactDetail,
  ContactEdit,
  UserProfile,
  UserProfileDetail,
  Notifications,
  TestNotifications,
  AttachmentViewer,
} from "./lazyPages";

/**
 * Routes related to settings, user profile, and configuration.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const settingsRoutes = (
  <>
    <Route
      path="/settings"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Settings />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/import"
      element={<Navigate to="/settings?tab=data-import" replace />}
    />
    <Route
      path="/import/review"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <ImportReview />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/admin"
      element={<Navigate to="/settings" replace />}
    />
    <Route
      path="/users"
      element={<Navigate to="/settings" replace />}
    />
    <Route
      path="/users/:id"
      element={
        <ProtectedRoute blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <UserProfileDetail />
          </Suspense>
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LazyLoadFallback />}>
            <UserProfile />
          </Suspense>
        </ProtectedRoute>
      }
    />
    <Route
      path="/notifications"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <Notifications />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/test-notifications"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <TestNotifications />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Accounts />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts/:id"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <AccountDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts/:id/edit"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <AccountEdit />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Contacts />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts/:id"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <ContactDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts/:id/edit"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <ContactEdit />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/attachments/:id/view"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <AttachmentViewer />
          </Suspense>
        </RouteWrapper>
      }
    />
  </>
);

export default settingsRoutes;
