import { Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { RouteWrapper } from "./RouteWrapper";
import { LazyLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Cases,
  CaseDetail,
  CaseWizard,
  SubjectDetail,
  Subjects,
  Activities,
  Updates,
  UpdateDetail,
  CaseUpdateDetail,
  Calendar,
  NewExpenseEntry,
  ExpenseEntryDetail,
  EditExpenseEntry,
  NewCaseUpdate,
  CaseRequests,
  CaseRequestDetail,
  NewCaseRequest,
} from "./lazyPages";

/**
 * Routes related to case management.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const caseRoutes = (
  <>
    <Route
      path="/cases"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <Cases />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/requests"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseRequests />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/requests/new"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <NewCaseRequest />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/requests/:id"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseRequestDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/new"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseWizard />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:id"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/subjects/:subjectId"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <SubjectDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/updates/new"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <NewCaseUpdate />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/updates/:updateId"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <CaseUpdateDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/expenses/new"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <NewExpenseEntry />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/expenses/:expenseId/edit"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <EditExpenseEntry />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/cases/:caseId/expenses/:expenseId"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <ExpenseEntryDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/subjects"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Subjects />
          </Suspense>
        </RouteWrapper>
      }
    />
    {/* Unified Activities route */}
    <Route
      path="/activities"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Activities />
          </Suspense>
        </RouteWrapper>
      }
    />
    {/* Backwards compatibility redirects */}
    <Route
      path="/tasks"
      element={<Navigate to="/activities?type=task" replace />}
    />
    <Route
      path="/events"
      element={<Navigate to="/activities?type=event" replace />}
    />
    <Route
      path="/updates"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Updates />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/updates/:id"
      element={
        <RouteWrapper>
          <Suspense fallback={<LazyLoadFallback />}>
            <UpdateDetail />
          </Suspense>
        </RouteWrapper>
      }
    />
    <Route
      path="/calendar"
      element={
        <RouteWrapper blockVendors>
          <Suspense fallback={<LazyLoadFallback />}>
            <Calendar />
          </Suspense>
        </RouteWrapper>
      }
    />
  </>
);

export default caseRoutes;
