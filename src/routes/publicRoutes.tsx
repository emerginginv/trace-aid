import { Route, Navigate } from "react-router-dom";
import Auth from "@/pages/Auth";
import TrustCenter from "@/pages/TrustCenter";
import StatusPage from "@/pages/StatusPage";
import SecurityReport from "@/pages/SecurityReport";
import AcceptInvite from "@/pages/AcceptInvite";
import StyleGuide from "@/pages/StyleGuide";
import PremiumShowcase from "@/pages/PremiumShowcase";
import AttachmentAccess from "@/pages/AttachmentAccess";
import NotFound from "@/pages/NotFound";

/**
 * Public routes that don't require authentication.
 */
export const publicRoutes = (
  <>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/trust" element={<TrustCenter />} />
    <Route path="/status" element={<StatusPage />} />
    <Route path="/security/report" element={<SecurityReport />} />
    <Route path="/accept-invite" element={<AcceptInvite />} />
    <Route path="/style-guide" element={<StyleGuide />} />
    <Route path="/premium-showcase" element={<PremiumShowcase />} />
    <Route path="/attachment/:token" element={<AttachmentAccess />} />
    <Route path="*" element={<NotFound />} />
  </>
);

export default publicRoutes;
