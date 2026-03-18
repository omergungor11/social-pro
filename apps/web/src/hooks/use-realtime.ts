"use client";

import { useEffect, useState } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/stores/notification-store";

// ---------------------------------------------------------------------------
// Custom hook: manages the Socket.io connection for real-time events
// ---------------------------------------------------------------------------

interface UseRealtimeResult {
  isConnected: boolean;
}

export function useRealtime(): UseRealtimeResult {
  const [isConnected, setIsConnected] = useState(false);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    // Only run in the browser
    if (typeof window === "undefined") return;

    const socket = getSocket();

    function onConnect(): void {
      setIsConnected(true);
    }

    function onDisconnect(): void {
      setIsConnected(false);
    }

    function onNotificationNew(notification: Notification): void {
      addNotification(notification);
      void fetchUnreadCount();
    }

    function onPostStatusChanged(payload: unknown): void {
      // Emit a custom DOM event so post-list pages can react without tight coupling
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sp:post-status-changed", { detail: payload })
        );
      }
    }

    function onAccountStatusChanged(payload: unknown): void {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sp:account-status-changed", { detail: payload })
        );
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification:new", onNotificationNew);
    socket.on("post:status-changed", onPostStatusChanged);
    socket.on("account:status-changed", onAccountStatusChanged);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("notification:new", onNotificationNew);
      socket.off("post:status-changed", onPostStatusChanged);
      socket.off("account:status-changed", onAccountStatusChanged);
      disconnectSocket();
    };
  }, [addNotification, fetchUnreadCount]);

  return { isConnected };
}
