"use client";

import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface PaginatedNotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

interface UnreadCountResponse {
  count: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  // actions
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,

  setOpen: (open: boolean): void => {
    set({ isOpen: open });
  },

  toggleOpen: (): void => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  fetchNotifications: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const response =
        await apiClient.get<PaginatedNotificationsResponse>(
          "/notifications?page=1&limit=20&unreadOnly=false"
        );
      set({ notifications: response.items ?? [] });
    } catch {
      // Fail silently — UI remains functional with empty list
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (): Promise<void> => {
    try {
      const response =
        await apiClient.get<UnreadCountResponse>(
          "/notifications/unread-count"
        );
      set({ unreadCount: response.count ?? 0 });
    } catch {
      // Fail silently
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      await apiClient.patch<Notification>(
        `/notifications/${id}/read`
      );
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // Fail silently
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.post("/notifications/mark-all-read");
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch {
      // Fail silently
    }
  },

  addNotification: (notification: Notification): void => {
    set((state) => {
      // Avoid duplicates
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
