/**
 * Entry Status Configuration
 * 
 * Centralized configuration for time and expense entry statuses.
 * 
 * Status Flow:
 * - New entry → pending (Awaiting Review)
 * - Manager approves → approved (Ready for invoicing/payment)
 * - Manager declines → declined (User must edit and resubmit)
 * - Added to payment slip → committed
 * - Payment recorded → paid
 * - Admin voids approved entry → voided
 */

export type EntryStatus = 'pending' | 'approved' | 'declined' | 'committed' | 'voided' | 'paid';

export type EntryStatusFilter = 'all' | EntryStatus;

export interface StatusConfig {
  label: string;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: 'check' | 'x' | 'clock' | 'ban' | 'checkCircle';
  showStrikethrough?: boolean;
}

export const ENTRY_STATUS_CONFIG: Record<EntryStatus, StatusConfig> = {
  pending: {
    label: 'Awaiting Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    badgeVariant: 'outline',
    icon: 'clock',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-300',
    badgeVariant: 'default',
    icon: 'check',
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-800 border-red-300',
    badgeVariant: 'destructive',
    icon: 'x',
  },
  committed: {
    label: 'Committed',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    badgeVariant: 'secondary',
    icon: 'checkCircle',
  },
  voided: {
    label: 'Voided',
    color: 'bg-gray-100 text-gray-500 border-gray-300',
    badgeVariant: 'outline',
    icon: 'ban',
    showStrikethrough: true,
  },
  paid: {
    label: 'Paid',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeVariant: 'default',
    icon: 'checkCircle',
  },
};

export const ENTRY_STATUS_OPTIONS: { value: EntryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Awaiting Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'committed', label: 'Committed' },
  { value: 'voided', label: 'Voided' },
  { value: 'paid', label: 'Paid' },
];

export const getStatusConfig = (status: string): StatusConfig => {
  return ENTRY_STATUS_CONFIG[status as EntryStatus] || ENTRY_STATUS_CONFIG.pending;
};

export const getStatusColor = (status: string): string => {
  return getStatusConfig(status).color;
};

export const getStatusLabel = (status: string): string => {
  return getStatusConfig(status).label;
};

export const getBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  return getStatusConfig(status).badgeVariant;
};
