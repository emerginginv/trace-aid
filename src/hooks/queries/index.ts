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

export {
  useCasesQuery,
  useCaseQuery,
  useUpdateCaseMutation,
  useDeleteCaseMutation,
} from './useCasesQuery';

export type { Case } from './useCasesQuery';

export {
  useContactsQuery,
  useContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from './useContactsQuery';

export type { Contact } from './useContactsQuery';

export {
  useInvoicesQuery,
  useInvoiceQuery,
  useUpdateInvoiceMutation,
  useInvoiceStats,
} from './useInvoicesQuery';

export type { Invoice } from './useInvoicesQuery';
