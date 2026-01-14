import React from 'react';
import { cn } from '@/lib/utils';

export interface PanelListItemProps {
  /** Click handler */
  onClick?: () => void;
  /** Whether item is expanded/selected */
  isExpanded?: boolean;
  /** Additional class name */
  className?: string;
  /** Item content */
  children: React.ReactNode;
}

/**
 * A consistent list item component for panel content.
 * Provides standard styling with hover and expanded states.
 * 
 * @example
 * <PanelListItem onClick={() => handleClick(item)} isExpanded={expandedId === item.id}>
 *   <div className="flex items-start gap-3">
 *     <Icon />
 *     <div>Content</div>
 *   </div>
 * </PanelListItem>
 */
export function PanelListItem({
  onClick,
  isExpanded = false,
  className,
  children,
}: PanelListItemProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors',
        onClick && 'cursor-pointer',
        isExpanded && 'ring-1 ring-primary/20',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default PanelListItem;
