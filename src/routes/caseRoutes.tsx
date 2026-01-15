import { Route } from "react-router-dom";
import { RouteWrapper } from "./RouteWrapper";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import { CaseWizard } from "@/components/case-wizard";
import SubjectDetail from "@/pages/SubjectDetail";
import Subjects from "@/pages/Subjects";
import Tasks from "@/pages/Tasks";
import Events from "@/pages/Events";
import Updates from "@/pages/Updates";
import UpdateDetail from "@/pages/UpdateDetail";
import CaseUpdateDetail from "@/pages/CaseUpdateDetail";
import Calendar from "@/pages/Calendar";

/**
 * Routes related to case management.
 */
export const caseRoutes = (
  <>
    <Route
      path="/cases"
      element={
        <RouteWrapper>
          <Cases />
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/new"
      element={
        <RouteWrapper>
          <CaseWizard />
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:id"
      element={
        <RouteWrapper>
          <CaseDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/subjects/:subjectId"
      element={
        <RouteWrapper>
          <SubjectDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/updates/:updateId"
      element={
        <RouteWrapper>
          <CaseUpdateDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/subjects"
      element={
        <RouteWrapper blockVendors>
          <Subjects />
        </RouteWrapper>
      }
    />
    <Route
      path="/tasks"
      element={
        <RouteWrapper blockVendors>
          <Tasks />
        </RouteWrapper>
      }
    />
    <Route
      path="/events"
      element={
        <RouteWrapper blockVendors>
          <Events />
        </RouteWrapper>
      }
    />
    <Route
      path="/updates"
      element={
        <RouteWrapper blockVendors>
          <Updates />
        </RouteWrapper>
      }
    />
    <Route
      path="/updates/:id"
      element={
        <RouteWrapper>
          <UpdateDetail />
        </RouteWrapper>
      }
    />
    <Route
      path="/calendar"
      element={
        <RouteWrapper blockVendors>
          <Calendar />
        </RouteWrapper>
      }
    />
  </>
);

export default caseRoutes;
