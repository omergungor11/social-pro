import { io, type Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Singleton socket instance for the /notifications namespace
// ---------------------------------------------------------------------------

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket !== null) return socket;

  const apiUrl =
    process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("sp_access_token")
      : null;

  socket = io(`${apiUrl}/notifications`, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket !== null) {
    socket.disconnect();
    socket = null;
  }
}
