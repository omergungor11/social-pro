# Phase 9: Notifications & Real-time

## TASK-073: Prisma Schema — Notification Entities

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-008

### Acceptance Criteria
- [ ] `Notification` model: id, agency_id, user_id, type (POST_PUBLISHED/POST_FAILED/INVITATION/PAYMENT_SUCCESS/PAYMENT_FAILED/ACCOUNT_DISCONNECT/LIMIT_WARNING/REPORT_READY enum), title, body, data (Json), read_at, timestamps
- [ ] `NotificationPreference` model: id, user_id, agency_id, channel (IN_APP/EMAIL enum), type, enabled, timestamps. Unique(user_id, agency_id, channel, type)
- [ ] `AuditLog` model: id, agency_id, user_id, action, entity_type, entity_id, changes (Json), ip_address, timestamps
- [ ] Indexes: (user_id, read_at), (agency_id, created_at)
- [ ] Migration applied

---

## TASK-074: Notification Module + WebSocket Gateway

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-073, TASK-011

### Acceptance Criteria
- [ ] `NotificationService` — create, list, mark read, mark all read
- [ ] `GET /api/v1/notifications` — list notifications (paginated, unread first)
- [ ] `PATCH /api/v1/notifications/:id/read` — mark as read
- [ ] `POST /api/v1/notifications/mark-all-read`
- [ ] `GET /api/v1/notifications/preferences` — get preferences
- [ ] `PATCH /api/v1/notifications/preferences` — update preferences
- [ ] Socket.io WebSocket gateway: `notifications` namespace
- [ ] Room per agency: `agency:{agency_id}`
- [ ] Events: `notification:new`, `post:status-changed`, `account:status-changed`
- [ ] JWT authentication for WebSocket connections

---

## TASK-075: Email Notification Service

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-074

### Acceptance Criteria
- [ ] Email service (nodemailer + SMTP or SendGrid/Resend)
- [ ] MailHog integration for local development
- [ ] Email templates: invitation, password reset, payment receipt, post failed, account disconnected
- [ ] HTML email templates (mjml or react-email)
- [ ] BullMQ job for async email sending
- [ ] Unsubscribe link in emails
- [ ] Respect user notification preferences

---

## TASK-076: Social Platform Webhook Receivers

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-027, TASK-074

### Acceptance Criteria
- [ ] `POST /api/v1/webhooks/twitter` — Twitter webhook
- [ ] `POST /api/v1/webhooks/facebook` — Facebook webhook (verification + events)
- [ ] `POST /api/v1/webhooks/linkedin` — LinkedIn webhook
- [ ] `POST /api/v1/webhooks/tiktok` — TikTok webhook
- [ ] `POST /api/v1/webhooks/youtube` — YouTube pub/sub
- [ ] Signature verification per platform
- [ ] Events: new comment, mention, account status change
- [ ] Store raw events for debugging
- [ ] Trigger notifications for relevant events

---

## TASK-077: Audit Log Service

**Agent**: backend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-011

### Acceptance Criteria
- [ ] `AuditService` — log actions with entity context
- [ ] Auto-capture: who, what, when, changes (before/after diff)
- [ ] Integrated into key modules: client create/update/delete, post publish, social account connect/disconnect, team member changes, billing changes
- [ ] `GET /api/v1/audit-log` — query audit logs (filtered by entity type, user, date range)
- [ ] Tenant-scoped

---

## TASK-078: Notification Center UI

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-074

### Acceptance Criteria
- [ ] Bell icon in header with unread count badge
- [ ] Dropdown panel: notification list (icon, title, time, unread indicator)
- [ ] Click notification → navigate to relevant page
- [ ] "Mark all as read" button
- [ ] "View all" → full notifications page
- [ ] Notification preferences page (toggles per type per channel)
- [ ] Empty state when no notifications

---

## TASK-079: Real-time WebSocket Integration

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-078

### Acceptance Criteria
- [ ] Socket.io client connection (auto-connect on dashboard load)
- [ ] JWT authentication on connect
- [ ] Listen for `notification:new` → update bell badge + show toast
- [ ] Listen for `post:status-changed` → update post list in real-time
- [ ] Listen for `account:status-changed` → update account health indicator
- [ ] Auto-reconnect on disconnect
- [ ] Zustand store for real-time state
- [ ] Connection status indicator (optional)
