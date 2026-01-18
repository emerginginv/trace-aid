/**
 * Consolidated Entity Types
 * 
 * This barrel file exports all entity types for easy imports.
 * 
 * Usage:
 *   import { Case, Account, Contact } from '@/types/entities';
 *   import type { CaseDetail, AccountReference } from '@/types/entities';
 */

// Case types
export type {
  CaseRow,
  CaseInsert,
  CaseUpdate,
  Case,
  CaseDetail,
  EditableCase,
  CaseReference,
  CaseListItem,
  CaseStatus,
} from './case';

// Account types
export type {
  AccountRow,
  AccountInsert,
  AccountUpdate,
  Account,
  AccountDetail,
  AccountReference,
  AccountListItem,
  AccountCardData,
} from './account';

// Contact types
export type {
  ContactRow,
  ContactInsert,
  ContactUpdate,
  Contact,
  ContactWithAccount,
  ContactReference,
  EmailContact,
  ContactListItem,
  ContactCardData,
} from './contact';
export { getContactFullName } from './contact';

// Invoice types
export type {
  InvoiceRow,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceStatus,
  Invoice,
  InvoiceDetail,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceListItem,
} from './invoice';
