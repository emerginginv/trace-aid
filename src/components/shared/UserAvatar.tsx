import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

/**
 * Get initials from a name string
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * A consistent user avatar component with initials fallback.
 * 
 * @example
 * <UserAvatar name="John Doe" size="sm" />
 * <UserAvatar name="Jane Smith" avatarUrl="/avatar.jpg" showName />
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 'xs',
  className,
  showName = false,
  nameClassName,
}: UserAvatarProps) {
  const initials = getUserInitials(name);
  const firstName = name?.split(' ')[0] || '';

  return (
    <span className={cn('flex items-center gap-1', className)}>
      <Avatar className={cn(sizeClasses[size], 'bg-primary/10')}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name || 'User'} />}
        <AvatarFallback className="bg-primary/10 font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && firstName && (
        <span className={cn('text-xs text-muted-foreground', nameClassName)}>
          {firstName}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
