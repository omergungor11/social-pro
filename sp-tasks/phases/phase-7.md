# Phase 7: Analytics & Reporting

## TASK-057: Prisma Schema — Analytics Entities

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-026

### Acceptance Criteria
- [ ] `AnalyticsSnapshot` model: id, social_account_id, post_target_id (nullable), metric_type (FOLLOWERS/ENGAGEMENT/IMPRESSIONS/REACH/CLICKS/LIKES/COMMENTS/SHARES/SAVES enum), value (BigInt), period_start, period_end, raw_data (Json), fetched_at, timestamps
- [ ] `AnalyticsReport` model: id, agency_id, client_id, title, date_range_start, date_range_end, report_type (WEEKLY/MONTHLY/CUSTOM enum), generated_data (Json), pdf_url, timestamps
- [ ] Indexes: (social_account_id, metric_type, period_start), (agency_id, report_type)
- [ ] Migration applied

---

## TASK-058: Analytics Fetcher Service

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-057, TASK-027

### Description
Her platform'dan analytics verisi cek. Platform adapter pattern.

### Acceptance Criteria
- [ ] `AnalyticsFetcher` interface: fetchAccountMetrics(), fetchPostMetrics()
- [ ] Twitter adapter: followers, impressions, engagements, retweets
- [ ] Facebook adapter: page likes, reach, impressions, engagement
- [ ] Instagram adapter: followers, reach, impressions, saves
- [ ] LinkedIn adapter: followers, impressions, clicks, engagement
- [ ] TikTok adapter: followers, views, likes, shares
- [ ] YouTube adapter: subscribers, views, watch time, likes
- [ ] Store raw + aggregated data in AnalyticsSnapshot
- [ ] Error handling: platform API failures don't block other platforms

---

## TASK-059: Analytics Aggregation Service

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-058

### Acceptance Criteria
- [ ] `GET /api/v1/analytics/overview` — dashboard summary (total followers, engagement rate, impressions, top posts)
- [ ] `GET /api/v1/analytics/accounts/:id` — per-account time series
- [ ] `GET /api/v1/analytics/posts/:id` — per-post metrics
- [ ] Time series aggregation: daily, weekly, monthly
- [ ] Comparison: current vs previous period (% change)
- [ ] Platform breakdown: metrics per platform
- [ ] Date range filter

---

## TASK-060: Scheduled Analytics Fetch Job

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-058

### Acceptance Criteria
- [ ] BullMQ cron: fetch account metrics every 6 hours
- [ ] BullMQ cron: fetch post metrics for recent posts (last 7 days) every hour
- [ ] Staggered execution (don't hit all platforms simultaneously)
- [ ] Rate limit compliance per platform
- [ ] Error logging + retry
- [ ] Skip inactive accounts

---

## TASK-061: Report Generation Service

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-059

### Acceptance Criteria
- [ ] `POST /api/v1/analytics/reports` — generate report (async job)
- [ ] `GET /api/v1/analytics/reports` — list reports
- [ ] `GET /api/v1/analytics/reports/:id` — get report data
- [ ] `GET /api/v1/analytics/reports/:id/export` — download PDF
- [ ] Report content: date range, platform breakdown, top posts, growth, engagement trends
- [ ] PDF generation (puppeteer or react-pdf)
- [ ] BullMQ job for async generation
- [ ] Notify when ready

---

## TASK-062: Analytics Dashboard Page

**Agent**: frontend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-015, TASK-059

### Acceptance Criteria
- [ ] Overview cards: total followers, engagement rate, impressions, posts published
- [ ] Follower growth chart (line chart, per platform)
- [ ] Engagement chart (bar chart, per platform)
- [ ] Top performing posts (table)
- [ ] Platform breakdown (pie chart)
- [ ] Date range picker (7d, 30d, 90d, custom)
- [ ] Account filter (all / specific account)
- [ ] Client filter
- [ ] Comparison toggle (vs previous period)
- [ ] Charts: Recharts library

---

## TASK-063: Post Analytics Detail View

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-062, TASK-049

### Acceptance Criteria
- [ ] Per-post metrics: impressions, reach, engagement, clicks, likes, comments, shares
- [ ] Platform-specific metrics breakdown
- [ ] Performance comparison vs average
- [ ] Engagement timeline (if available)
- [ ] Accessible from post list page

---

## TASK-064: Report Generation + Download Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-062, TASK-061

### Acceptance Criteria
- [ ] Reports list: title, date range, type, status, created date
- [ ] "Generate Report" dialog: date range, client, platforms, report type
- [ ] Generating state → ready notification
- [ ] View report inline (rendered data)
- [ ] Download as PDF button
- [ ] Delete report
