import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Update {
  id: string;
  user_id: string;
  is_legacy_billing?: boolean;
}

interface UpdateEditability {
  canEdit: boolean;
  canDelete: boolean;
  canManageBilling: boolean;
  canLinkAttachments: boolean;
  readOnlyReason: string | null;
  isOwner: boolean;
}

/**
 * Centralized hook for determining update editability based on:
 * - User permissions (edit_updates, edit_own_updates, delete_updates, delete_own_updates)
 * - Ownership (user_id matches current user)
 * - Legacy status (is_legacy_billing)
 * - Case status (closed cases are read-only)
 */
export function useUpdateEditability(
  update: Update | null,
  caseStatus: string | null | undefined
): UpdateEditability {
  const { hasPermission } = usePermissions();
  const { data: currentUser } = useCurrentUser();

  // Calculate ownership
  const isOwner = Boolean(update && currentUser && update.user_id === currentUser.id);
  
  // Check flags
  const isLegacy = update?.is_legacy_billing === true;
  const isClosed = caseStatus === "closed";

  // Permission checks
  const canEditAll = hasPermission("edit_updates");
  const canEditOwn = hasPermission("edit_own_updates");
  const canDeleteAll = hasPermission("delete_updates");
  const canDeleteOwn = hasPermission("delete_own_updates");

  // Determine read-only reason (priority order: legacy > closed > permissions)
  let readOnlyReason: string | null = null;
  
  if (isLegacy) {
    readOnlyReason = "Legacy updates cannot be modified";
  } else if (isClosed) {
    readOnlyReason = "Case is closed";
  } else if (!canEditAll && !canEditOwn) {
    readOnlyReason = "You don't have permission to edit updates";
  } else if (!canEditAll && canEditOwn && !isOwner) {
    readOnlyReason = "You can only edit updates you created";
  }

  // Calculate final editability
  const canEdit = !readOnlyReason;
  
  // Delete permissions: legacy/closed always blocked, then check permissions + ownership
  const canDelete = !isLegacy && !isClosed && (canDeleteAll || (canDeleteOwn && isOwner));
  
  // Billing management: can edit and not legacy
  const canManageBilling = canEdit && !isLegacy;
  
  // Attachment linking: follows edit permissions
  const canLinkAttachments = canEdit;

  return {
    canEdit,
    canDelete,
    canManageBilling,
    canLinkAttachments,
    readOnlyReason,
    isOwner,
  };
}
