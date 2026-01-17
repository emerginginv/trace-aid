import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateFormConfig, CaseRequestFormConfig } from "@/types/case-request-form-config";

export interface OrganizationSettings {
  company_name: string | null;
  logo_url: string | null;
  square_logo_url: string | null;
  website_url: string | null;
}

export interface CaseRequestForm {
  id: string;
  organization_id: string;
  form_name: string;
  form_slug: string | null;
  is_active: boolean;
  is_public: boolean;
  logo_url: string | null;
  primary_color: string | null;
  organization_display_name: string | null;
  organization_phone: string | null;
  organization_website: string | null;
  header_instructions: string | null;
  success_message: string | null;
  send_confirmation_email: boolean | null;
  confirmation_email_subject: string | null;
  confirmation_email_body: string | null;
  notify_staff_on_submission: boolean | null;
  staff_notification_emails: string[] | null;
  field_config: CaseRequestFormConfig;
  created_at: string;
  updated_at: string;
  // Organization fallback settings
  org_settings?: OrganizationSettings | null;
}

export function useCaseRequestFormBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['case-request-form', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Form slug is required');

      const { data, error } = await supabase
        .from('case_request_forms')
        .select('*')
        .eq('form_slug', slug)
        .eq('is_active', true)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Form not found or is not active');

      // Fetch organization branding from secure public view (only exposes minimal fields)
      const { data: orgSettings } = await supabase
        .from('organization_public_branding')
        .select('company_name, logo_url, square_logo_url, website_url')
        .eq('organization_id', data.organization_id)
        .maybeSingle();

      // Validate and merge field config with defaults
      const validatedFieldConfig = validateFormConfig(data.field_config as any);

      return {
        ...data,
        field_config: validatedFieldConfig,
        org_settings: orgSettings,
      } as CaseRequestForm;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useCaseTypesForPublicForm(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['case-types-public-form', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');

      const { data, error } = await supabase
        .from('case_types')
        .select('id, name, tag, description, allowed_service_ids, allowed_subject_types, default_subject_type, budget_strategy, color')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('allow_on_public_form', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaseServicesForPublicForm(organizationId: string | undefined, serviceIds: string[] | null) {
  return useQuery({
    queryKey: ['case-services-public-form', organizationId, serviceIds],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');

      let query = supabase
        .from('case_services')
        .select('id, name, code, description, color')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (serviceIds && serviceIds.length > 0) {
        query = query.in('id', serviceIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubjectTypesForPublicForm(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['subject-types-public-form', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');

      const { data, error } = await supabase
        .from('subject_types')
        .select('id, name, category, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
