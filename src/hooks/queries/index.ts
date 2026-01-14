/**
 * React Query hooks for data fetching with caching.
 * 
 * These hooks provide:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Optimistic updates
 * - Background refetching
 * 
 * @example
 * import { useCasesQuery, useContactsQuery, useAccountsQuery } from '@/hooks/queries';
 * 
 * function MyComponent() {
 *   const { data: cases, isLoading } = useCasesQuery({ status: 'active' });
 *   // ...
 * }
 */

// Cases
export {
  useCasesQuery,
  useCaseQuery,
  useUpdateCaseMutation,
  useDeleteCaseMutation,
} from './useCasesQuery';
export type { Case } from './useCasesQuery';

// Contacts
export {
  useContactsQuery,
  useContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from './useContactsQuery';
export type { Contact } from './useContactsQuery';

// Invoices
export {
  useInvoicesQuery,
  useInvoiceQuery,
  useUpdateInvoiceMutation,
  useInvoiceStats,
} from './useInvoicesQuery';
export type { Invoice } from './useInvoicesQuery';

// Accounts
export {
  useAccountsQuery,
  useAccountQuery,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from './useAccountsQuery';
export type { Account, AccountInput } from './useAccountsQuery';

// Activities (Tasks & Events)
export {
  useActivitiesQuery,
  useTasksQuery,
  useEventsQuery,
  usePendingTasksQuery,
  useCreateActivity,
  useUpdateActivity,
  useToggleActivityComplete,
  useDeleteActivity,
} from './useActivitiesQuery';
export type { Activity, ActivityInput } from './useActivitiesQuery';

// Expenses & Time Entries
export {
  useExpensesQuery,
  useOnlyExpensesQuery,
  useTimeEntriesQuery,
  useExpenseStats,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from './useExpensesQuery';
export type { Expense, ExpenseInput } from './useExpensesQuery';

// Profiles
export {
  useOrganizationProfilesQuery,
  useCurrentProfileQuery,
  useProfileQuery,
  useUpdateCurrentProfile,
} from './useProfilesQuery';
export type { Profile, ProfileInput } from './useProfilesQuery';

// Case Subjects
export {
  useCaseSubjectsQuery,
  useCaseSubjectQuery,
  usePrimarySubjectQuery,
  useCreateCaseSubject,
  useUpdateCaseSubject,
  useDeleteCaseSubject,
} from './useCaseSubjectsQuery';
export type { CaseSubject, CaseSubjectInput } from './useCaseSubjectsQuery';

// Case Updates
export {
  useCaseUpdatesQuery,
  useCaseUpdatesByCaseId,
  useCreateCaseUpdate,
  useUpdateCaseUpdate,
  useDeleteCaseUpdate,
} from './useCaseUpdatesQuery';
export type { CaseUpdate, CaseUpdateInput } from './useCaseUpdatesQuery';

// Notifications
export {
  useNotificationsQuery,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useCreateNotification,
  useDeleteNotification,
} from './useNotificationsQuery';
export type { Notification, NotificationInput } from './useNotificationsQuery';

// Case Services
export {
  useCaseServicesQuery,
  useCaseServiceQuery,
  useCreateCaseService,
  useUpdateCaseService,
  useDeleteCaseService,
  useReorderCaseServices,
} from './useCaseServicesQuery';
export type { CaseService, CaseServiceInput } from './useCaseServicesQuery';
