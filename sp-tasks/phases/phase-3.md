# Phase 3: Social Account Connections

## TASK-026: Prisma Schema — SocialAccount

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-008

### Acceptance Criteria
- [ ] `SocialAccount` model: id, agency_id, client_id (nullable), platform (enum: TWITTER, FACEBOOK, INSTAGRAM, LINKEDIN, TIKTOK, YOUTUBE), platform_user_id, platform_username, display_name, avatar_url, access_token, refresh_token, token_expires_at, scopes (String[]), metadata (Json), is_active, connected_at, last_synced_at, timestamps
- [ ] Unique constraint: (agency_id, platform, platform_user_id)
- [ ] `SocialPlatform` enum
- [ ] Token fields marked for encryption (handled in service layer)
- [ ] Migration applied

---

## TASK-027: OAuth Connector Base + Platform Registry

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-026, TASK-011

### Description
Strategy pattern ile OAuth connector altyapisi. Her platform bir adapter.

### Acceptance Criteria
- [ ] `SocialOAuthConnector` interface: getAuthUrl(), exchangeCode(), refreshToken(), revokeToken(), getUserProfile()
- [ ] `PlatformRegistry` — platform enum'a gore connector resolve et
- [ ] `SocialAccountService` — connect, disconnect, list, refresh, health check
- [ ] `GET /api/v1/social-accounts` — list connected accounts
- [ ] `GET /api/v1/social-accounts/oauth/:platform/url` — get OAuth redirect URL
- [ ] `GET /api/v1/social-accounts/oauth/:platform/callback` — handle callback
- [ ] `DELETE /api/v1/social-accounts/:id` — disconnect
- [ ] Token encryption/decryption service (AES-256-GCM)
- [ ] State parameter for CSRF protection

---

## TASK-028: Twitter/X OAuth2 Connector

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] Twitter OAuth 2.0 PKCE flow
- [ ] Scopes: tweet.read, tweet.write, users.read, offline.access
- [ ] Token refresh implementation
- [ ] getUserProfile() — fetch username, display name, avatar
- [ ] Rate limit headers tracking

---

## TASK-029: Facebook + Instagram OAuth Connector

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] Meta Graph API OAuth flow
- [ ] Facebook Pages: pages_manage_posts, pages_read_engagement
- [ ] Instagram Business: instagram_basic, instagram_content_publish
- [ ] Long-lived token exchange
- [ ] Page selection flow (user may have multiple pages)
- [ ] getUserProfile() for both platforms

---

## TASK-030: LinkedIn OAuth Connector

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] LinkedIn OAuth 2.0 flow
- [ ] Scopes: w_member_social, r_liteprofile, r_organization_social
- [ ] Company page vs personal profile posting
- [ ] Token refresh
- [ ] getUserProfile()

---

## TASK-031: TikTok OAuth Connector

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] TikTok Login Kit OAuth flow
- [ ] Scopes: video.publish, video.list, user.info.basic
- [ ] Token refresh
- [ ] getUserProfile()

---

## TASK-032: YouTube OAuth Connector

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] Google OAuth 2.0 flow (YouTube Data API v3)
- [ ] Scopes: youtube.upload, youtube.readonly
- [ ] Channel selection
- [ ] Token refresh
- [ ] getUserProfile()

---

## TASK-033: Token Refresh Background Job

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-027

### Acceptance Criteria
- [ ] BullMQ repeatable job: every 15 minutes
- [ ] Query tokens expiring within 30 minutes
- [ ] Refresh using platform-specific connector
- [ ] On failure: mark account `is_active = false`, notify user
- [ ] Log refresh attempts
- [ ] Idempotent — safe to retry

---

## TASK-034: Social Accounts Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-027

### Acceptance Criteria
- [ ] Connected accounts list: platform icon, username, status (active/expired), connected date
- [ ] "Connect Account" button → platform selection modal
- [ ] Platform selection → OAuth redirect flow
- [ ] Disconnect button with confirmation
- [ ] Connection health indicator (green/yellow/red)
- [ ] Filter by platform, by client
- [ ] Assign account to client (optional)
