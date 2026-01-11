/**
 * Billing utility functions for status badges and formatting
 */

export type BillingStatus = 'active' | 'pending_payment' | 'past_due' | 'canceled' | 'trialing';

export interface StatusBadgeConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}

export function getBillingStatusConfig(status: string | null | undefined): StatusBadgeConfig {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        variant: 'default',
        className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
      };
    case 'trialing':
      return {
        label: 'Trial',
        variant: 'secondary',
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
      };
    case 'pending_payment':
      return {
        label: 'Pending Payment',
        variant: 'outline',
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
      };
    case 'past_due':
      return {
        label: 'Past Due',
        variant: 'outline',
        className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20',
      };
    case 'canceled':
      return {
        label: 'Canceled',
        variant: 'destructive',
        className: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20',
      };
    default:
      return {
        label: status || 'Unknown',
        variant: 'secondary',
        className: 'bg-muted text-muted-foreground',
      };
  }
}

export function formatBillingEventType(eventType: string): string {
  const eventTypeMap: Record<string, string> = {
    'checkout.session.completed': 'Subscription Activated',
    'invoice.payment_succeeded': 'Payment Successful',
    'invoice.payment_failed': 'Payment Failed',
    'customer.subscription.deleted': 'Subscription Canceled',
    'customer.subscription.updated': 'Subscription Updated',
    'customer.subscription.created': 'Subscription Created',
    'invoice.created': 'Invoice Created',
    'invoice.finalized': 'Invoice Finalized',
    'invoice.paid': 'Invoice Paid',
  };
  
  return eventTypeMap[eventType] || eventType.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getBillingEventIcon(eventType: string): 'success' | 'error' | 'warning' | 'info' {
  if (eventType.includes('failed') || eventType.includes('deleted')) {
    return 'error';
  }
  if (eventType.includes('succeeded') || eventType.includes('completed') || eventType.includes('paid')) {
    return 'success';
  }
  if (eventType.includes('updated')) {
    return 'warning';
  }
  return 'info';
}
