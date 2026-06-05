import {
  InboxItemType,
  InboxItemStatus,
  SocialPlatform,
} from '@social-pro/shared-types';
import type { Platform } from '@/components/social/platform-icon';

export function toPlatformIcon(platform: SocialPlatform): Platform {
  return platform.toLowerCase() as Platform;
}

export function relativeTime(value: string | null): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const TYPE_LABEL: Record<InboxItemType, string> = {
  [InboxItemType.COMMENT]: 'Comment',
  [InboxItemType.REPLY]: 'Reply',
  [InboxItemType.MENTION]: 'Mention',
  [InboxItemType.DIRECT_MESSAGE]: 'Direct message',
};

export const TYPE_BADGE: Record<
  InboxItemType,
  'default' | 'purple' | 'blue' | 'green' | 'gray'
> = {
  [InboxItemType.COMMENT]: 'blue',
  [InboxItemType.REPLY]: 'gray',
  [InboxItemType.MENTION]: 'purple',
  [InboxItemType.DIRECT_MESSAGE]: 'green',
};

export const STATUS_LABEL: Record<InboxItemStatus, string> = {
  [InboxItemStatus.UNREAD]: 'Unread',
  [InboxItemStatus.READ]: 'Read',
  [InboxItemStatus.REPLIED]: 'Replied',
  [InboxItemStatus.ARCHIVED]: 'Archived',
};

export function authorInitials(name: string | null, username: string | null): string {
  const src = (name ?? username ?? '?').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
