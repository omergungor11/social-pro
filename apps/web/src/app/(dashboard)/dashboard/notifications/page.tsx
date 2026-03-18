"use client";

import { useState, useEffect, useCallback } from "react";
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
  Settings,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/format-time-ago";
import { apiClient } from "@/lib/api-client";
import { NotificationType } from "@social-pro/shared-types";
import type { Notification } from "@/stores/notification-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaginatedNotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NotificationMeta {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  href: string;
  label: string;
}

function getNotificationMeta(type: string): NotificationMeta {
  switch (type) {
    case NotificationType.POST_PUBLISHED:
      return {
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-50",
        href: "/dashboard/posts",
        label: "Post Published",
      };
    case NotificationType.POST_FAILED:
      return {
        icon: AlertCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-50",
        href: "/dashboard/posts",
        label: "Post Failed",
      };
    case NotificationType.INVITATION:
      return {
        icon: Mail,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        href: "/dashboard/team",
        label: "Invitation",
      };
    case NotificationType.PAYMENT_SUCCESS:
      return {
        icon: CreditCard,
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-50",
        href: "/dashboard/billing",
        label: "Payment Successful",
      };
    case NotificationType.PAYMENT_FAILED:
      return {
        icon: CreditCard,
        iconColor: "text-red-600",
        bgColor: "bg-red-50",
        href: "/dashboard/billing",
        label: "Payment Failed",
      };
    case NotificationType.ACCOUNT_DISCONNECT:
      return {
        icon: Unlink,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50",
        href: "/dashboard/social-accounts",
        label: "Account Disconnected",
      };
    case NotificationType.LIMIT_WARNING:
      return {
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50",
        href: "/dashboard/billing",
        label: "Limit Warning",
      };
    case NotificationType.REPORT_READY:
      return {
        icon: FileText,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        href: "/dashboard/analytics/reports",
        label: "Report Ready",
      };
    default:
      return {
        icon: Bell,
        iconColor: "text-slate-500",
        bgColor: "bg-slate-100",
        href: "/dashboard/notifications",
        label: "Notification",
      };
  }
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type FilterTab = "all" | "unread";

interface FilterTabsProps {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}

function FilterTabs({ active, onChange }: FilterTabsProps): React.JSX.Element {
  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
            active === tab.id
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification row
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  notification: Notification;
  onRead: (id: string) => void;
}

function NotificationRow({
  notification,
  onRead,
}: NotificationRowProps): React.JSX.Element {
  const router = useRouter();
  const isUnread = notification.readAt === null;
  const { icon: Icon, iconColor, bgColor, href } = getNotificationMeta(
    notification.type
  );

  function handleClick(): void {
    if (isUnread) {
      onRead(notification.id);
    }
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left flex items-start gap-4 px-6 py-4 transition-colors",
        "hover:bg-slate-50",
        isUnread && "border-l-4 border-blue-600 bg-blue-50/40 pl-5"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          bgColor
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm leading-snug",
                isUnread
                  ? "font-semibold text-slate-900"
                  : "font-medium text-slate-700"
              )}
            >
              {notification.title}
            </p>
            {notification.body !== undefined && notification.body !== "" && (
              <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                {notification.body}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  isFiltered: boolean;
}

function EmptyState({ isFiltered }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
        <Bell className="h-6 w-6 text-slate-400" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-slate-700">
        {isFiltered ? "No unread notifications" : "No notifications yet"}
      </p>
      <p className="mt-1.5 text-sm text-slate-400 max-w-xs">
        {isFiltered
          ? "You're all caught up! Switch to All to see past notifications."
          : "When something important happens, you'll see it here."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: PaginationProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className={cn(
            "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors",
            page <= 1
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className={cn(
            "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors",
            page >= totalPages
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PageSkeleton(): React.JSX.Element {
  return (
    <div className="divide-y divide-slate-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
          <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="h-2.5 w-1/4 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const LIMIT = 20;

export default function NotificationsPage(): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const unreadOnly = filter === "unread";
      const response = await apiClient.get<PaginatedNotificationsResponse>(
        `/api/v1/notifications?page=${page}&limit=${LIMIT}&unreadOnly=${unreadOnly}`
      );
      setNotifications(response.items ?? []);
      setTotalPages(response.totalPages ?? 1);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  async function handleMarkAllRead(): Promise<void> {
    try {
      await apiClient.post("/api/v1/notifications/mark-all-read");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
    } catch {
      // Fail silently
    }
  }

  function handleRead(id: string): void {
    void apiClient.patch(`/api/v1/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
  }

  const hasUnread = notifications.some((n) => n.readAt === null);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay up to date with your posts, team, and billing.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasUnread && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
          <Link
            href="/dashboard/notifications/preferences"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </Link>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Tabs + refresh */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <FilterTabs active={filter} onChange={setFilter} />
        </div>

        {/* Content */}
        {isLoading ? (
          <PageSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyState isFiltered={filter === "unread"} />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={handleRead}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>
    </div>
  );
}
