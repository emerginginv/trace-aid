import { Route, Navigate } from "react-router-dom";
import { RouteWrapper } from "./RouteWrapper";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import Settings from "@/pages/Settings";
import ImportReview from "@/pages/ImportReview";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import AccountEdit from "@/pages/AccountEdit";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import ContactEdit from "@/pages/ContactEdit";
import UserProfile from "@/pages/UserProfile";
import UserProfileDetail from "@/pages/UserProfileDetail";
import Notifications from "@/pages/Notifications";
import TestNotifications from "@/pages/TestNotifications";
import AttachmentViewer from "@/pages/AttachmentViewer";

/**
 * Routes related to settings, user profile, and configuration.
 */
export const settingsRoutes = (
  <>
    <Route
      path="/settings"
      element={
        <RouteWrapper blockVendors>
          <Settings />
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
          <ImportReview />
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
          <UserProfileDetail />
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
        <RouteWrapper>
          <Notifications />
        </RouteWrapper>
      }
    />
    <Route
      path="/test-notifications"
      element={
        <RouteWrapper>
          <TestNotifications />
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts"
      element={
        <RouteWrapper blockVendors>
          <Accounts />
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts/:id"
      element={
        <RouteWrapper blockVendors>
          <AccountDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/accounts/:id/edit"
      element={
        <RouteWrapper blockVendors>
          <AccountEdit />
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts"
      element={
        <RouteWrapper blockVendors>
          <Contacts />
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts/:id"
      element={
        <RouteWrapper blockVendors>
          <ContactDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/contacts/:id/edit"
      element={
        <RouteWrapper blockVendors>
          <ContactEdit />
        </RouteWrapper>
      }
    />
    <Route
      path="/attachments/:id/view"
      element={
        <RouteWrapper>
          <AttachmentViewer />
        </RouteWrapper>
      }
    />
  </>
);

export default settingsRoutes;
