import * as React from 'react';
import { cn } from '@/lib/utils';
import { authorInitials } from './helpers';

interface InboxAvatarProps {
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  className?: string;
}

export function InboxAvatar({
  name,
  username,
  avatarUrl,
  className,
}: InboxAvatarProps): React.JSX.Element {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          'h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200',
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold',
        className
      )}
      aria-hidden="true"
    >
      {authorInitials(name, username)}
    </div>
  );
}
