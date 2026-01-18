import { Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { PageLoadFallback } from "@/components/ui/LazyLoadFallback";
import {
  Auth,
  TrustCenter,
  StatusPage,
  SecurityReport,
  AcceptInvite,
  StyleGuide,
  PremiumShowcase,
  AttachmentAccess,
  CaseRequestIntake,
  NotFound,
} from "./lazyPages";

/**
 * Public routes that don't require authentication.
 * All pages are lazy-loaded for better initial bundle size.
 */
export const publicRoutes = (
  <>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route
      path="/auth"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <Auth />
        </Suspense>
      }
    />
    <Route
      path="/trust"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <TrustCenter />
        </Suspense>
      }
    />
    <Route
      path="/status"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <StatusPage />
        </Suspense>
      }
    />
    <Route
      path="/security/report"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <SecurityReport />
        </Suspense>
      }
    />
    <Route
      path="/accept-invite"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <AcceptInvite />
        </Suspense>
      }
    />
    <Route
      path="/style-guide"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <StyleGuide />
        </Suspense>
      }
    />
    <Route
      path="/premium-showcase"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <PremiumShowcase />
        </Suspense>
      }
    />
    <Route
      path="/attachment/:token"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <AttachmentAccess />
        </Suspense>
      }
    />
    <Route
      path="/request/:slug"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <CaseRequestIntake />
        </Suspense>
      }
    />
    <Route
      path="*"
      element={
        <Suspense fallback={<PageLoadFallback />}>
          <NotFound />
        </Suspense>
      }
    />
  </>
);

export default publicRoutes;
