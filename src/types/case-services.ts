/**
 * Case Services Types
 * 
 * This file contains type definitions for case services including
 * future-ready hooks for planned integrations.
 */

// ===========================================
// FUTURE-READY HOOKS - DO NOT IMPLEMENT YET
// ===========================================

/**
 * FUTURE: Budget Linkage Hook
 * 
 * Planned integration:
 * - Services can consume budget when scheduled/completed
 * - Budget tracking per service type
 * - Automatic budget deduction from case budget
 */
export interface CaseServiceBudgetHook {
  /** Budget category: 'hourly' | 'fixed' | 'expense' */
  budget_category?: 'hourly' | 'fixed' | 'expense' | null;
  /** Default hours or dollar amount for this service */
  default_budget_amount?: number | null;
  /** Unit of measurement: 'hours' | 'dollars' */
  budget_unit?: 'hours' | 'dollars' | null;
}

/**
 * FUTURE: Billing Linkage Hook
 * 
 * Planned integration:
 * - Services generate invoice line items automatically
 * - Configurable billing codes and rates
 * - Invoice line item templates
 */
export interface CaseServiceBillingHook {
  /** GL code or billing category */
  billing_code?: string | null;
  /** Default hourly rate or fixed fee */
  default_rate?: number | null;
  /** Whether this service generates invoice lines */
  is_billable?: boolean;
  /** Template for invoice line description */
  billing_description_template?: string | null;
}

/**
 * FUTURE: Instance-level Billing Hook
 * 
 * Tracks billing status for individual service instances
 */
export interface CaseServiceInstanceBillingHook {
  /** FK to invoice_line_items when billing is implemented */
  invoice_line_item_id?: string | null;
  /** When this instance was billed */
  billed_at?: string | null;
  /** Amount billed for this instance */
  billed_amount?: number | null;
}

/**
 * FUTURE: Report Section Mapping Hook
 * 
 * Planned integration:
 * - Services auto-populate report sections
 * - Configurable field mappings per template
 * - Order control within sections
 */
export interface CaseServiceReportHook {
  /** Section key for report templates */
  report_section_id?: string | null;
  /** Display order within the report section */
  report_section_order?: number | null;
  /** Field mappings for report generation */
  report_template_fields?: Record<string, unknown> | null;
}

/**
 * FUTURE: Analytics Tracking Hook
 * 
 * Planned integration:
 * - Metrics by service type
 * - Duration and outcome tracking
 * - Analytics dashboard groupings
 */
export interface CaseServiceAnalyticsHook {
  /** Category for analytics dashboard grouping */
  analytics_category?: string | null;
  /** Whether to track time spent on this service */
  track_duration?: boolean;
  /** Whether to track success/failure outcomes */
  track_outcomes?: boolean;
}

// ===========================================
// COMBINED FUTURE HOOKS INTERFACE
// ===========================================

/**
 * All future hooks combined for easy extension
 * When implementing a hook, extend CaseService with the relevant interface
 */
export interface CaseServiceFutureHooks
  extends CaseServiceBudgetHook,
    CaseServiceBillingHook,
    CaseServiceReportHook,
    CaseServiceAnalyticsHook {}

export interface CaseServiceInstanceFutureHooks
  extends CaseServiceInstanceBillingHook {}

// ===========================================
// PLANNED TABLE STRUCTURES (Reference Only)
// ===========================================

/**
 * FUTURE: report_section_mappings table
 * 
 * This table will be created when report section mapping is implemented:
 * 
 * CREATE TABLE report_section_mappings (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   case_service_id UUID REFERENCES case_services(id),
 *   report_template_id UUID REFERENCES report_templates(id),
 *   section_key TEXT NOT NULL,
 *   field_mappings JSONB DEFAULT '{}',
 *   display_order INTEGER DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   organization_id UUID REFERENCES organizations(id)
 * );
 */

/**
 * FUTURE: service_analytics_events table
 * 
 * This table will be created when analytics tracking is implemented:
 * 
 * CREATE TABLE service_analytics_events (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   case_service_instance_id UUID REFERENCES case_service_instances(id),
 *   event_type TEXT NOT NULL, -- 'scheduled', 'started', 'completed', 'cancelled'
 *   event_timestamp TIMESTAMPTZ DEFAULT now(),
 *   duration_minutes INTEGER,
 *   outcome TEXT, -- 'success', 'failure', 'partial'
 *   metadata JSONB DEFAULT '{}',
 *   organization_id UUID REFERENCES organizations(id)
 * );
 */
