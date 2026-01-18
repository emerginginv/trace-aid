import { lazy } from "react";

/**
 * Lazy-loaded page components for code splitting.
 * These are grouped by domain for better organization.
 * 
 * Usage: Import these instead of direct page imports in route files.
 */

// ============= Case Management =============
export const Cases = lazy(() => import("@/pages/Cases"));
export const CaseDetail = lazy(() => import("@/pages/CaseDetail"));
export const CaseWizard = lazy(() => 
  import("@/components/case-wizard").then(m => ({ default: m.CaseWizard }))
);
export const SubjectDetail = lazy(() => import("@/pages/SubjectDetail"));
export const Subjects = lazy(() => import("@/pages/Subjects"));
export const Activities = lazy(() => import("@/pages/Activities"));
export const Updates = lazy(() => import("@/pages/Updates"));
export const UpdateDetail = lazy(() => import("@/pages/UpdateDetail"));
export const CaseUpdateDetail = lazy(() => import("@/pages/CaseUpdateDetail"));
export const Calendar = lazy(() => import("@/pages/Calendar"));
export const NewExpenseEntry = lazy(() => import("@/pages/NewExpenseEntry"));
export const ExpenseEntryDetail = lazy(() => import("@/pages/ExpenseEntryDetail"));
export const EditExpenseEntry = lazy(() => import("@/pages/EditExpenseEntry"));
export const NewCaseUpdate = lazy(() => import("@/pages/NewCaseUpdate"));
export const CaseRequests = lazy(() => import("@/pages/CaseRequests"));
export const CaseRequestDetail = lazy(() => import("@/pages/CaseRequestDetail"));
export const NewCaseRequest = lazy(() => import("@/pages/NewCaseRequest"));

// ============= Finance =============
export const Finance = lazy(() => import("@/pages/Finance"));
export const AllExpenses = lazy(() => import("@/pages/AllExpenses"));
export const TimeEntries = lazy(() => import("@/pages/TimeEntries"));
export const TimeEntryDetail = lazy(() => import("@/pages/TimeEntryDetail"));
export const AllInvoices = lazy(() => import("@/pages/AllInvoices"));
export const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
export const ExpenseDetail = lazy(() => import("@/pages/ExpenseDetail"));
export const Expenses = lazy(() => import("@/pages/Expenses"));
export const Billing = lazy(() => import("@/pages/Billing"));
export const BillingReviewQueue = lazy(() => import("@/pages/BillingReviewQueue"));

// ============= Analytics =============
export const Analytics = lazy(() => import("@/pages/Analytics"));
export const CaseAnalytics = lazy(() => import("@/pages/CaseAnalytics"));
export const BudgetAnalytics = lazy(() => import("@/pages/BudgetAnalytics"));
export const TimeExpenseAnalytics = lazy(() => import("@/pages/TimeExpenseAnalytics"));
export const ActivityAnalytics = lazy(() => import("@/pages/ActivityAnalytics"));
export const SystemSecurityAnalytics = lazy(() => import("@/pages/SystemSecurityAnalytics"));

// ============= Settings & Configuration =============
export const Settings = lazy(() => import("@/pages/Settings"));
export const ImportReview = lazy(() => import("@/pages/ImportReview"));
export const Accounts = lazy(() => import("@/pages/Accounts"));
export const AccountDetail = lazy(() => import("@/pages/AccountDetail"));
export const AccountEdit = lazy(() => import("@/pages/AccountEdit"));
export const Contacts = lazy(() => import("@/pages/Contacts"));
export const ContactDetail = lazy(() => import("@/pages/ContactDetail"));
export const ContactEdit = lazy(() => import("@/pages/ContactEdit"));
export const UserProfile = lazy(() => import("@/pages/UserProfile"));
export const UserProfileDetail = lazy(() => import("@/pages/UserProfileDetail"));
export const Notifications = lazy(() => import("@/pages/Notifications"));
export const TestNotifications = lazy(() => import("@/pages/TestNotifications"));
export const AttachmentViewer = lazy(() => import("@/pages/AttachmentViewer"));

// ============= Platform =============
export const Onboarding = lazy(() => 
  import("@/components/Onboarding").then(m => ({ default: m.Onboarding }))
);
export const Dashboard = lazy(() => import("@/pages/Dashboard"));
export const SupportConsole = lazy(() => import("@/pages/SupportConsole"));
export const PlatformCompliance = lazy(() => import("@/pages/PlatformCompliance"));
export const PlatformResilience = lazy(() => import("@/pages/PlatformResilience"));
export const PlatformSecurity = lazy(() => import("@/pages/PlatformSecurity"));
export const TrustCenterAdmin = lazy(() => import("@/pages/TrustCenterAdmin"));
export const CustomerSuccess = lazy(() => import("@/pages/CustomerSuccess"));
export const Marketplace = lazy(() => import("@/pages/Marketplace"));

// ============= Public =============
export const Auth = lazy(() => import("@/pages/Auth"));
export const TrustCenter = lazy(() => import("@/pages/TrustCenter"));
export const StatusPage = lazy(() => import("@/pages/StatusPage"));
export const SecurityReport = lazy(() => import("@/pages/SecurityReport"));
export const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
export const StyleGuide = lazy(() => import("@/pages/StyleGuide"));
export const PremiumShowcase = lazy(() => import("@/pages/PremiumShowcase"));
export const AttachmentAccess = lazy(() => import("@/pages/AttachmentAccess"));
export const CaseRequestIntake = lazy(() => import("@/pages/CaseRequestIntake"));
export const NotFound = lazy(() => import("@/pages/NotFound"));
