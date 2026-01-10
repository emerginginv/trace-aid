// Help Center categories and articles structure
// Article content should be populated from a CMS or database in production

export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  articles: HelpArticle[];
}

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "Rocket",
    description: "Learn the basics of CaseWyze",
    articles: [
      { id: "gs-1", title: "Welcome to CaseWyze", summary: "An introduction to the platform" },
      { id: "gs-2", title: "Setting Up Your Account", summary: "Configure your profile and preferences" },
      { id: "gs-3", title: "Navigating the Dashboard", summary: "Understanding the main interface" },
      { id: "gs-4", title: "Quick Start Guide", summary: "Get up and running in minutes" },
    ],
  },
  {
    id: "cases",
    title: "Cases",
    icon: "Briefcase",
    description: "Managing cases and workflows",
    articles: [
      { id: "c-1", title: "Creating a New Case", summary: "Step-by-step case creation" },
      { id: "c-2", title: "Case Statuses and Workflows", summary: "Understanding case lifecycle" },
      { id: "c-3", title: "Searching and Filtering Cases", summary: "Find cases quickly" },
      { id: "c-4", title: "Case Templates", summary: "Using templates for efficiency" },
      { id: "c-5", title: "Archiving and Closing Cases", summary: "Proper case closure procedures" },
    ],
  },
  {
    id: "case-managers",
    title: "Case Managers",
    icon: "Users",
    description: "Assigning and managing case managers",
    articles: [
      { id: "cm-1", title: "Assigning Case Managers", summary: "How to assign team members" },
      { id: "cm-2", title: "Case Manager Permissions", summary: "Understanding access levels" },
      { id: "cm-3", title: "Workload Distribution", summary: "Balancing team assignments" },
      { id: "cm-4", title: "Manager Notifications", summary: "Configuring alerts for managers" },
    ],
  },
  {
    id: "evidence-attachments",
    title: "Evidence & Attachments",
    icon: "Paperclip",
    description: "Uploading and managing files",
    articles: [
      { id: "ea-1", title: "Uploading Attachments", summary: "Add files to cases" },
      { id: "ea-2", title: "Organizing with Folders", summary: "Folder structure best practices" },
      { id: "ea-3", title: "File Sharing and Access", summary: "Share files securely" },
      { id: "ea-4", title: "Supported File Types", summary: "Formats and size limits" },
      { id: "ea-5", title: "Evidence Chain of Custody", summary: "Tracking file access" },
    ],
  },
  {
    id: "timelines-activities",
    title: "Timelines & Activity Logs",
    icon: "Clock",
    description: "Tracking activities and events",
    articles: [
      { id: "ta-1", title: "Creating Timeline Entries", summary: "Log activities accurately" },
      { id: "ta-2", title: "Activity Types", summary: "Understanding entry categories" },
      { id: "ta-3", title: "Viewing Case History", summary: "Review past activities" },
      { id: "ta-4", title: "Exporting Activity Logs", summary: "Generate activity reports" },
    ],
  },
  {
    id: "budgets-expenses",
    title: "Budgets & Expenses",
    icon: "DollarSign",
    description: "Financial tracking and management",
    articles: [
      { id: "be-1", title: "Setting Case Budgets", summary: "Configure budget limits" },
      { id: "be-2", title: "Recording Expenses", summary: "Log costs and fees" },
      { id: "be-3", title: "Time Tracking", summary: "Log billable hours" },
      { id: "be-4", title: "Budget Alerts", summary: "Get notified on thresholds" },
      { id: "be-5", title: "Expense Categories", summary: "Organizing expense types" },
    ],
  },
  {
    id: "reports-exports",
    title: "Reports & Exports",
    icon: "FileText",
    description: "Generating and exporting reports",
    articles: [
      { id: "re-1", title: "Generating Case Reports", summary: "Create comprehensive reports" },
      { id: "re-2", title: "Report Templates", summary: "Using DOCX templates" },
      { id: "re-3", title: "Exporting Data", summary: "Export to various formats" },
      { id: "re-4", title: "Scheduling Reports", summary: "Automate report generation" },
    ],
  },
  {
    id: "analytics-dashboards",
    title: "Analytics & Dashboards",
    icon: "BarChart3",
    description: "Insights and data visualization",
    articles: [
      { id: "ad-1", title: "Dashboard Overview", summary: "Understanding metrics" },
      { id: "ad-2", title: "Custom Analytics", summary: "Create custom views" },
      { id: "ad-3", title: "Performance Metrics", summary: "Track team performance" },
      { id: "ad-4", title: "Financial Analytics", summary: "Revenue and expense insights" },
    ],
  },
  {
    id: "account-organization",
    title: "Account & Organization Settings",
    icon: "Settings",
    description: "Configure your organization",
    articles: [
      { id: "ao-1", title: "Organization Profile", summary: "Update company details" },
      { id: "ao-2", title: "User Management", summary: "Add and manage users" },
      { id: "ao-3", title: "Billing and Subscription", summary: "Manage your plan" },
      { id: "ao-4", title: "Email Settings", summary: "Configure email notifications" },
      { id: "ao-5", title: "Custom Fields", summary: "Extend with custom data" },
    ],
  },
  {
    id: "security-access",
    title: "Security & Access Control",
    icon: "Shield",
    description: "Security settings and permissions",
    articles: [
      { id: "sa-1", title: "User Roles and Permissions", summary: "Understanding access levels" },
      { id: "sa-2", title: "Two-Factor Authentication", summary: "Enable 2FA for security" },
      { id: "sa-3", title: "Audit Logs", summary: "Track system access" },
      { id: "sa-4", title: "Data Privacy", summary: "Your data protection rights" },
      { id: "sa-5", title: "Session Management", summary: "Control active sessions" },
    ],
  },
];

export function searchHelpContent(query: string): { category: HelpCategory; article: HelpArticle }[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  const results: { category: HelpCategory; article: HelpArticle }[] = [];

  for (const category of helpCategories) {
    for (const article of category.articles) {
      if (
        article.title.toLowerCase().includes(lowerQuery) ||
        article.summary.toLowerCase().includes(lowerQuery) ||
        category.title.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ category, article });
      }
    }
  }

  return results;
}
