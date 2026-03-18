"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Mail,
  CreditCard,
  Unlink,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/format-time-ago";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/stores/notification-store";
import { NotificationType } from "@social-pro/shared-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NotificationMeta {
  icon: React.ElementType;
  iconColor: string;
  href: string;
}

function getNotificationMeta(type: string): NotificationMeta {
  switch (type) {
    case NotificationType.POST_PUBLISHED:
      return {
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
        href: "/dashboard/posts",
      };
    case NotificationType.POST_FAILED:
      return {
        icon: AlertCircle,
        iconColor: "text-red-500",
        href: "/dashboard/posts",
      };
    case NotificationType.INVITATION:
      return {
        icon: Mail,
        iconColor: "text-blue-500",
        href: "/dashboard/team",
      };
    case NotificationType.PAYMENT_SUCCESS:
      return {
        icon: CreditCard,
        iconColor: "text-emerald-500",
        href: "/dashboard/billing",
      };
    case NotificationType.PAYMENT_FAILED:
      return {
        icon: CreditCard,
        iconColor: "text-red-500",
        href: "/dashboard/billing",
      };
    case NotificationType.ACCOUNT_DISCONNECT:
      return {
        icon: Unlink,
        iconColor: "text-amber-500",
        href: "/dashboard/social-accounts",
      };
    case NotificationType.LIMIT_WARNING:
      return {
        icon: AlertTriangle,
        iconColor: "text-amber-500",
        href: "/dashboard/billing",
      };
    case NotificationType.REPORT_READY:
      return {
        icon: FileText,
        iconColor: "text-blue-500",
        href: "/dashboard/analytics/reports",
      };
    default:
      return {
        icon: Bell,
        iconColor: "text-slate-400",
        href: "/dashboard/notifications",
      };
  }
}

// ---------------------------------------------------------------------------
// Single notification item
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps): React.JSX.Element {
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const router = useRouter();
  const isUnread = notification.readAt === null;
  const { icon: Icon, iconColor, href } = getNotificationMeta(notification.type);

  function handleClick(): void {
    if (isUnread) {
      void markAsRead(notification.id);
    }
    onClose();
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
        "hover:bg-slate-50",
        isUnread && "border-l-2 border-blue-600 bg-blue-50/50 pl-[14px]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUnread ? "bg-white shadow-sm" : "bg-slate-100"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", iconColor)} aria-hidden="true" />
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug truncate",
            isUnread ? "font-semibold text-slate-800" : "font-medium text-slate-700"
          )}
        >
          {notification.title}
        </p>
        {notification.body !== undefined && notification.body !== "" && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {isUnread && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
        <Bell className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-700">No notifications yet</p>
      <p className="mt-1 text-xs text-slate-400">
        We&apos;ll notify you when something happens.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="px-4 py-3 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="h-7 w-7 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-slate-200" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
            <div className="h-2 w-1/4 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification dropdown panel
// ---------------------------------------------------------------------------

export function NotificationDropdown(): React.JSX.Element {
  const notifications = useNotificationStore((s) => s.notifications);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const setOpen = useNotificationStore((s) => s.setOpen);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  // Fetch on first open if empty
  const hasLoaded = notifications.length > 0;

  // Trigger fetch when dropdown mounts (opened for the first time or refreshes)
  // We intentionally run on every open to keep data fresh
  if (!hasLoaded && !isLoading) {
    void fetchNotifications();
  }

  const hasUnread = notifications.some((n) => n.readAt === null);

  function handleClose(): void {
    setOpen(false);
  }

  function handleMarkAllRead(): void {
    void markAllAsRead();
  }

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute right-0 top-full mt-2 z-50",
          "w-96 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10",
          "overflow-hidden"
        )}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">
            Notifications
          </h2>
          {hasUnread && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
          {isLoading ? (
            <LoadingSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={handleClose}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2.5">
          <Link
            href="/dashboard/notifications"
            onClick={handleClose}
            className="block text-center text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  );
}
