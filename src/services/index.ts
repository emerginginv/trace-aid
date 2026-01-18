/**
 * Services Layer
 * 
 * This barrel file exports all service modules for easy imports.
 * Services abstract Supabase operations and provide a clean API
 * for data operations throughout the application.
 * 
 * Usage:
 *   import { caseService, accountService, contactService } from '@/services';
 */

export { caseService } from './caseService';
export type { CaseFilters, CaseCreateData, CaseUpdateData } from './caseService';

export { accountService } from './accountService';
export type { AccountFilters, AccountCreateData, AccountUpdateData } from './accountService';

export { contactService } from './contactService';
export type { ContactFilters, ContactCreateData, ContactUpdateData } from './contactService';
