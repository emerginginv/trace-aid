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
 * import { useCasesQuery, useContactsQuery } from '@/hooks/queries';
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
} from './useAccountsQuery';
export type { Account } from './useAccountsQuery';

// Activities (Tasks & Events)
export {
  useActivitiesQuery,
  useTasksQuery,
  useEventsQuery,
  usePendingTasksQuery,
} from './useActivitiesQuery';
export type { Activity } from './useActivitiesQuery';

// Expenses & Time Entries
export {
  useExpensesQuery,
  useOnlyExpensesQuery,
  useTimeEntriesQuery,
  useExpenseStats,
} from './useExpensesQuery';
export type { Expense } from './useExpensesQuery';
