# Phase 5: Post Creation & Scheduling

## TASK-040: Prisma Schema — Post Entities

**Agent**: db
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-026

### Acceptance Criteria
- [ ] `Post` model: id, agency_id, created_by_user_id, client_id (nullable), title, content (Json — rich text + per-platform variants), status (DRAFT/SCHEDULED/PUBLISHING/PUBLISHED/FAILED/CANCELLED enum), scheduled_at, published_at, ai_generated, ai_prompt, timestamps
- [ ] `PostMedia` model: id, post_id, media_type (IMAGE/VIDEO/GIF/DOCUMENT enum), url, thumbnail_url, file_size, mime_type, alt_text, storage_key, sort_order, timestamps
- [ ] `PostTarget` model: id, post_id, social_account_id, platform_post_id, platform_url, status (PENDING/PUBLISHING/PUBLISHED/FAILED enum), error_message, platform_specific_content (Json), published_at, timestamps
- [ ] `PostApproval` model: id, post_id, requested_by, approved_by, status (PENDING/APPROVED/REJECTED enum), comment, timestamps
- [ ] Relations: Post 1:N PostMedia, Post 1:N PostTarget, PostTarget N:1 SocialAccount
- [ ] Indexes: (agency_id, status), (agency_id, scheduled_at), (agency_id, client_id)

---

## TASK-041: Post Module — CRUD

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-040, TASK-011

### Acceptance Criteria
- [ ] `GET /api/v1/posts` — list with filters (status, platform, client, date range), pagination
- [ ] `POST /api/v1/posts` — create draft or scheduled post
- [ ] `GET /api/v1/posts/:id` — get with targets, media, approval status
- [ ] `PATCH /api/v1/posts/:id` — update (only DRAFT/SCHEDULED)
- [ ] `DELETE /api/v1/posts/:id` — delete (cancel if scheduled)
- [ ] `POST /api/v1/posts/:id/schedule` — set scheduled_at, create PostTargets
- [ ] `POST /api/v1/posts/:id/publish-now` — immediate publish
- [ ] `POST /api/v1/posts/:id/cancel` — cancel scheduled post
- [ ] `GET /api/v1/posts/calendar` — calendar view (date range → posts)
- [ ] `POST /api/v1/posts/:id/media` — attach media to post
- [ ] `DELETE /api/v1/posts/:id/media/:mediaId` — remove media
- [ ] Content supports per-platform variants (different text/hashtags per platform)

---

## TASK-042: Post Scheduling Service

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-041

### Description
BullMQ delayed job'lari ile post zamanlama. Safety net cron job.

### Acceptance Criteria
- [ ] Post schedule edildiginde: delayed BullMQ job olustur (exact delay)
- [ ] Job tetiklendiginde: Publisher service'i cagir
- [ ] Safety net: her dakika cron job — kacmis scheduled post'lari kontrol et
- [ ] Cancel: BullMQ job'u sil + post status CANCELLED
- [ ] Reschedule: eski job sil, yeni job olustur
- [ ] Timezone handling: scheduled_at always UTC, display in agency timezone

---

## TASK-043: Publisher Base Service + Adapter Pattern

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-041, TASK-027

### Description
Strategy pattern ile platform-specific publishing. Her platform bir adapter.

### Acceptance Criteria
- [ ] `PlatformPublisher` interface: publish(post, target, account), validate(post), getCharacterLimit()
- [ ] `PublisherService` — orchestrate publishing to multiple targets
- [ ] Per-target status tracking (each platform publishes independently)
- [ ] Rate limiting per platform (Redis token bucket)
- [ ] Retry logic: exponential backoff, max 3 retries
- [ ] On failure: update target status, notify user
- [ ] On success: store platform_post_id + platform_url

---

## TASK-044: Twitter Publisher Adapter

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-043

### Acceptance Criteria
- [ ] Text post (max 280 chars)
- [ ] Image post (max 4 images)
- [ ] Video post
- [ ] Thread support (multiple tweets)
- [ ] Media upload via Twitter API
- [ ] Return tweet ID + URL

---

## TASK-045: Facebook/Instagram Publisher Adapter

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-043

### Acceptance Criteria
- [ ] Facebook Page post (text + media)
- [ ] Instagram single image/video post
- [ ] Instagram carousel post
- [ ] Caption + hashtags
- [ ] Media upload via Graph API
- [ ] Return post ID + URL

---

## TASK-046: LinkedIn Publisher Adapter

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-043

### Acceptance Criteria
- [ ] Text post
- [ ] Image post
- [ ] Article sharing
- [ ] Company page vs personal profile
- [ ] Return post URN + URL

---

## TASK-047: TikTok + YouTube Publisher Adapters

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-043

### Acceptance Criteria
- [ ] TikTok: video upload + caption
- [ ] TikTok: privacy settings
- [ ] YouTube: video upload + title + description + tags
- [ ] YouTube: privacy status (public/private/unlisted)
- [ ] YouTube: thumbnail upload
- [ ] Progress tracking for video uploads

---

## TASK-048: Post Creation/Edit Page

**Agent**: frontend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-015, TASK-041, TASK-039

### Acceptance Criteria
- [ ] Rich text editor (Tiptap) for post content
- [ ] Platform selector: choose target platforms (checkboxes)
- [ ] Per-platform content variants (tab per platform, override text)
- [ ] Media attachment: drag-drop + gallery
- [ ] Preview panel: how post looks on each platform
- [ ] Character counter per platform
- [ ] Client selector (assign post to client)
- [ ] Schedule picker: date + time + timezone
- [ ] Actions: Save Draft, Schedule, Publish Now
- [ ] AI Generate button (links to AI module, Phase 6)

---

## TASK-049: Post List + Calendar View

**Agent**: frontend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-015, TASK-041

### Acceptance Criteria
- [ ] List view: table with title, platforms (icons), status badge, scheduled date, client, actions
- [ ] Calendar view: monthly calendar with posts as colored dots/cards
- [ ] Filter: by status, by platform, by client, by date range
- [ ] Quick actions: edit, duplicate, delete, cancel scheduled
- [ ] Status badges: Draft (gray), Scheduled (blue), Published (green), Failed (red)
- [ ] Click post → edit page
- [ ] Toggle between list/calendar view
