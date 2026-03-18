import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Notification, NotificationChannel, NotificationPreference, NotificationType } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaginatedResponseDto } from "../common/dto/pagination.dto";
import { NotificationListQueryDto } from "./dto/notification-list-query.dto";
import { NotificationPreferenceItemDto } from "./dto/update-preferences.dto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateNotificationParams {
  agencyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Gateway reference injected lazily to avoid circular deps
  private gateway: NotificationGatewayInterface | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register the WebSocket gateway so the service can emit real-time events.
   * Called by NotificationGateway.onModuleInit().
   */
  setGateway(gateway: NotificationGatewayInterface): void {
    this.gateway = gateway;
  }

  // ---------------------------------------------------------------------------
  // Create notification
  // ---------------------------------------------------------------------------

  async create(params: CreateNotificationParams): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        agencyId: params.agencyId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        data: params.data ?? undefined,
      },
    });

    this.logger.log(
      `Notification created: id=${notification.id} userId=${params.userId} type=${params.type}`
    );

    // Emit real-time event via WebSocket gateway
    if (this.gateway) {
      this.gateway.emitToUser(params.userId, params.agencyId, "notification:new", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  // ---------------------------------------------------------------------------
  // List notifications (paginated)
  // ---------------------------------------------------------------------------

  async list(
    userId: string,
    agencyId: string,
    query: NotificationListQueryDto
  ): Promise<PaginatedResponseDto<Notification>> {
    const { page, limit, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      agencyId,
      ...(unreadOnly === true ? { readAt: null } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          // Unread first: null readAt sorts before non-null
          { readAt: { sort: "asc", nulls: "first" } },
          { createdAt: "desc" },
        ],
      }),
      this.prisma.notification.count({ where }),
    ]);

    return PaginatedResponseDto.of(notifications, total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Unread count
  // ---------------------------------------------------------------------------

  async getUnreadCount(userId: string, agencyId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, agencyId, readAt: null },
    });
  }

  // ---------------------------------------------------------------------------
  // Mark one as read
  // ---------------------------------------------------------------------------

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    if (notification.readAt) {
      // Already read — return as-is
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Mark all as read
  // ---------------------------------------------------------------------------

  async markAllAsRead(userId: string, agencyId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, agencyId, readAt: null },
      data: { readAt: new Date() },
    });

    this.logger.log(
      `Marked all notifications as read: userId=${userId} agencyId=${agencyId} count=${result.count}`
    );

    return { count: result.count };
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  async getPreferences(
    userId: string,
    agencyId: string
  ): Promise<NotificationPreference[]> {
    const existing = await this.prisma.notificationPreference.findMany({
      where: { userId, agencyId },
    });

    if (existing.length > 0) {
      return existing;
    }

    // Create defaults: all types + channels enabled
    const types = Object.values(NotificationType);
    const channels = Object.values(NotificationChannel);

    const defaults = types.flatMap((type) =>
      channels.map((channel) => ({ userId, agencyId, channel, type, enabled: true }))
    );

    await this.prisma.notificationPreference.createMany({
      data: defaults,
      skipDuplicates: true,
    });

    return this.prisma.notificationPreference.findMany({
      where: { userId, agencyId },
    });
  }

  async updatePreferences(
    userId: string,
    agencyId: string,
    prefs: NotificationPreferenceItemDto[]
  ): Promise<NotificationPreference[]> {
    await Promise.all(
      prefs.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_agencyId_channel_type: {
              userId,
              agencyId,
              channel: pref.channel,
              type: pref.type,
            },
          },
          create: {
            userId,
            agencyId,
            channel: pref.channel,
            type: pref.type,
            enabled: pref.enabled,
          },
          update: { enabled: pref.enabled },
        })
      )
    );

    return this.getPreferences(userId, agencyId);
  }

  // ---------------------------------------------------------------------------
  // Should notify check
  // ---------------------------------------------------------------------------

  async shouldNotify(
    userId: string,
    agencyId: string,
    channel: NotificationChannel,
    type: NotificationType
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_agencyId_channel_type: { userId, agencyId, channel, type },
      },
    });

    // Default: notify if no preference record exists
    if (!pref) {
      return true;
    }

    return pref.enabled;
  }
}

// ---------------------------------------------------------------------------
// Gateway interface (avoids circular import)
// ---------------------------------------------------------------------------

export interface NotificationGatewayInterface {
  emitToUser(userId: string, agencyId: string, event: string, data: unknown): void;
  emitToAgency(agencyId: string, event: string, data: unknown): void;
}
