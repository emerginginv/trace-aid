import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCaseStatusActions } from "@/hooks/use-case-status-actions";

interface Update {
  id: string;
  user_id: string;
  is_legacy_billing?: boolean;
}

interface UpdateEditability {
  canEdit: boolean;
  canDelete: boolean;
  canLinkAttachments: boolean;
  readOnlyReason: string | null;
  isOwner: boolean;
}

/**
 * Centralized hook for determining update editability based on:
 * - Case status (via useCaseStatusActions - status-authoritative behavior)
 * - User permissions (edit_updates, edit_own_updates, delete_updates, delete_own_updates)
 * - Ownership (user_id matches current user)
 * - Legacy status (is_legacy_billing)
 */
export function useUpdateEditability(
  update: Update | null,
  caseStatus: string | null | undefined
): UpdateEditability {
  const { hasPermission } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const statusActions = useCaseStatusActions(caseStatus);

  // Calculate ownership
  const isOwner = Boolean(update && currentUser && update.user_id === currentUser.id);
  
  // Check flags
  const isLegacy = update?.is_legacy_billing === true;

  // Permission checks
  const canEditAll = hasPermission("edit_updates");
  const canEditOwn = hasPermission("edit_own_updates");
  const canDeleteAll = hasPermission("delete_updates");
  const canDeleteOwn = hasPermission("delete_own_updates");

  // Determine read-only reason (priority order: status > legacy > permissions)
  let readOnlyReason: string | null = null;
  
  // First check status-based restrictions
  if (!statusActions.canEditUpdates && statusActions.restrictionReason) {
    readOnlyReason = statusActions.restrictionReason;
  } else if (isLegacy) {
    readOnlyReason = "Legacy updates cannot be modified";
  } else if (!canEditAll && !canEditOwn) {
    readOnlyReason = "You don't have permission to edit updates";
  } else if (!canEditAll && canEditOwn && !isOwner) {
    readOnlyReason = "You can only edit updates you created";
  }

  // Calculate final editability
  const canEdit = !readOnlyReason;
  
  // Delete permissions: status check first, then legacy, then permissions + ownership
  const canDelete = statusActions.canEditUpdates && !isLegacy && (canDeleteAll || (canDeleteOwn && isOwner));
  
  // Attachment linking: follows edit permissions but also check status
  const canLinkAttachments = statusActions.canAddAttachments && canEdit;

  return {
    canEdit,
    canDelete,
    canLinkAttachments,
    readOnlyReason,
    isOwner,
  };
}
