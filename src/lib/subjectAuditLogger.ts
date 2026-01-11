import { supabase } from "@/integrations/supabase/client";

export type SubjectAuditAction = 
  | 'created' 
  | 'updated' 
  | 'archived' 
  | 'restored' 
  | 'deleted'
  | 'cover_image_added'
  | 'cover_image_removed'
  | 'profile_image_added'
  | 'profile_image_removed';

export type SocialLinkAuditAction = 'created' | 'updated' | 'deleted';

export interface SubjectAuditLogEntry {
  subject_id: string;
  case_id: string;
  organization_id: string;
  action: SubjectAuditAction;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
}

export interface SocialLinkAuditLogEntry {
  social_link_id: string;
  subject_id: string;
  organization_id: string;
  action: SocialLinkAuditAction;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

/**
 * Compute the changes between two objects, returning only the fields that differ
 */
export const computeChanges = (
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Record<string, { old: any; new: any }> => {
  const changes: Record<string, { old: any; new: any }> = {};
  const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
  
  for (const key of allKeys) {
    // Skip internal timestamps that are auto-managed
    if (key === 'updated_at' || key === 'created_at') continue;
    
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  return changes;
};

/**
 * Log an audit entry for subject changes
 * This creates an immutable, court-defensible record of the action
 */
export const logSubjectAudit = async (entry: SubjectAuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Cannot log audit: No authenticated user');
      return;
    }
    
    const { error } = await supabase.from('subject_audit_logs').insert({
      subject_id: entry.subject_id,
      case_id: entry.case_id,
      organization_id: entry.organization_id,
      actor_user_id: user.id,
      action: entry.action,
      previous_values: entry.previous_values || {},
      new_values: entry.new_values || {},
      changes: entry.changes || {},
    });

    if (error) {
      console.error('Failed to log subject audit:', error);
    }
  } catch (error) {
    console.error('Error logging subject audit:', error);
  }
};

/**
 * Log an audit entry for social link changes
 * This creates an immutable, court-defensible record of the action
 */
export const logSocialLinkAudit = async (entry: SocialLinkAuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Cannot log audit: No authenticated user');
      return;
    }
    
    const { error } = await supabase.from('subject_social_link_audit_logs').insert({
      social_link_id: entry.social_link_id,
      subject_id: entry.subject_id,
      organization_id: entry.organization_id,
      actor_user_id: user.id,
      action: entry.action,
      previous_values: entry.previous_values || {},
      new_values: entry.new_values || {},
    });

    if (error) {
      console.error('Failed to log social link audit:', error);
    }
  } catch (error) {
    console.error('Error logging social link audit:', error);
  }
};
