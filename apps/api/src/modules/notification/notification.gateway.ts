import {
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { NotificationService, NotificationGatewayInterface } from "./notification.service";

// ---------------------------------------------------------------------------
// JWT payload shape (mirrors auth.guard.ts)
// ---------------------------------------------------------------------------

interface JwtPayload {
  sub: string;
  agencyId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, NotificationGatewayInterface, OnModuleInit
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Map socketId → { userId, agencyId } for cleanup on disconnect
  private readonly connectedSockets = new Map<
    string,
    { userId: string; agencyId: string }
  >();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService
  ) {}

  onModuleInit(): void {
    // Register this gateway with the service so it can emit events
    this.notificationService.setGateway(this);
  }

  // ---------------------------------------------------------------------------
  // Connection handling
  // ---------------------------------------------------------------------------

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WS connection rejected (no token): socketId=${client.id}`);
      client.disconnect(true);
      return;
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env["JWT_SECRET"],
      });
    } catch {
      this.logger.warn(
        `WS connection rejected (invalid token): socketId=${client.id}`
      );
      client.disconnect(true);
      return;
    }

    const { sub: userId, agencyId } = payload;

    // Join user-specific room and agency broadcast room
    const userRoom = `user:${userId}`;
    const agencyRoom = `agency:${agencyId}`;

    await client.join(userRoom);
    await client.join(agencyRoom);

    this.connectedSockets.set(client.id, { userId, agencyId });

    this.logger.log(
      `WS connected: socketId=${client.id} userId=${userId} agencyId=${agencyId}`
    );
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const info = this.connectedSockets.get(client.id);

    if (info) {
      this.logger.log(
        `WS disconnected: socketId=${client.id} userId=${info.userId} agencyId=${info.agencyId}`
      );
      this.connectedSockets.delete(client.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Emit helpers
  // ---------------------------------------------------------------------------

  emitToUser(userId: string, agencyId: string, event: string, data: unknown): void {
    const userRoom = `user:${userId}`;
    this.server.to(userRoom).emit(event, data);

    this.logger.debug(
      `Emit to user: event=${event} userId=${userId} agencyId=${agencyId}`
    );
  }

  emitToAgency(agencyId: string, event: string, data: unknown): void {
    const agencyRoom = `agency:${agencyId}`;
    this.server.to(agencyRoom).emit(event, data);

    this.logger.debug(
      `Emit to agency: event=${event} agencyId=${agencyId}`
    );
  }

  // ---------------------------------------------------------------------------
  // Token extraction
  // ---------------------------------------------------------------------------

  private extractToken(client: Socket): string | undefined {
    // Try handshake auth object first (recommended)
    const authToken = (client.handshake.auth as Record<string, unknown>)["token"];
    if (typeof authToken === "string" && authToken.length > 0) {
      return authToken;
    }

    // Fall back to query parameter
    const queryToken = client.handshake.query["token"];
    if (typeof queryToken === "string" && queryToken.length > 0) {
      return queryToken;
    }

    // Fall back to Authorization header
    const authHeader = client.handshake.headers["authorization"];
    if (typeof authHeader === "string") {
      const parts = authHeader.split(" ");
      if (parts[0]?.toLowerCase() === "bearer" && parts[1]) {
        return parts[1];
      }
    }

    return undefined;
  }
}
