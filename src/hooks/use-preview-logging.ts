import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

type AttachmentType = 'case' | 'subject';
type PreviewType = 'modal' | 'fullscreen' | 'thumbnail';

export function usePreviewLogging() {
  const { organization } = useOrganization();

  const logPreview = useCallback(async (
    attachmentId: string,
    attachmentType: AttachmentType,
    previewType: PreviewType
  ) => {
    if (!organization?.id) {
      console.warn('No organization context for preview logging');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for preview logging');
        return;
      }

      const { error } = await supabase
        .from('attachment_preview_logs')
        .insert({
          attachment_id: attachmentId,
          attachment_type: attachmentType,
          user_id: user.id,
          organization_id: organization.id,
          preview_type: previewType,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Failed to log preview:', error);
      }
    } catch (err) {
      console.error('Error logging preview:', err);
    }
  }, [organization?.id]);

  return { logPreview };
}
