# Phase 8: Billing & Subscriptions

## TASK-065: Prisma Schema — Billing Entities

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-008

### Acceptance Criteria
- [ ] `Plan` model: id, name, slug, stripe_price_id, interval (MONTHLY/YEARLY enum), max_social_accounts, max_clients, max_team_members, max_scheduled_posts_per_month, ai_credits_per_month, storage_limit_gb, features (Json), price_cents, is_active, timestamps
- [ ] `BillingEvent` model: id, agency_id, stripe_event_id, event_type, amount_cents, currency, metadata (Json), timestamps
- [ ] `UsageRecord` model: id, agency_id, metric (POSTS_PUBLISHED/AI_GENERATIONS/STORAGE_BYTES/SOCIAL_ACCOUNTS/CLIENTS/TEAM_MEMBERS enum), value, period_start, period_end, timestamps
- [ ] Seed data: Free, Pro ($49/mo), Business ($99/mo), Enterprise ($199/mo) plans
- [ ] Migration applied

---

## TASK-066: Billing Module — Stripe SDK

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-065, TASK-011

### Acceptance Criteria
- [ ] Stripe SDK initialization + configuration
- [ ] `GET /api/v1/billing/plans` — list active plans
- [ ] Create Stripe Customer when agency registers
- [ ] Map Stripe Customer ↔ Agency
- [ ] `POST /api/v1/billing/portal` — Stripe Customer Portal URL
- [ ] `GET /api/v1/billing/subscription` — current subscription details
- [ ] Price display in agency's currency

---

## TASK-067: Subscription Lifecycle

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-066

### Acceptance Criteria
- [ ] `POST /api/v1/billing/subscribe` — create checkout session → redirect to Stripe
- [ ] `POST /api/v1/billing/change-plan` — upgrade/downgrade (proration)
- [ ] `POST /api/v1/billing/cancel` — cancel at period end
- [ ] `POST /api/v1/billing/resume` — resume cancelled subscription
- [ ] Free plan: no Stripe subscription needed
- [ ] Trial period support (14 days)
- [ ] Upgrade: immediate access to new limits
- [ ] Downgrade: effective at next billing cycle

---

## TASK-068: Stripe Webhook Handler

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-066

### Acceptance Criteria
- [ ] `POST /api/v1/webhooks/stripe` — webhook endpoint
- [ ] Signature verification (stripe-signature header)
- [ ] Events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- [ ] On payment success: activate/extend subscription
- [ ] On payment failure: notify user, grace period
- [ ] On subscription cancel: schedule downgrade
- [ ] Store all events in BillingEvent table
- [ ] Idempotent processing (check stripe_event_id)

---

## TASK-069: Usage Tracking + Limit Enforcement

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-066, TASK-011

### Acceptance Criteria
- [ ] `UsageTrackingService` — increment/query usage per agency per period
- [ ] `GET /api/v1/billing/usage` — current usage vs plan limits
- [ ] Limits enforced: max social accounts, max clients, max team members, max posts/month, max AI credits/month, storage limit
- [ ] `PlanLimitGuard` — NestJS guard that checks limits before creating resources
- [ ] Graceful enforcement: return 403 with `{ upgrade_required: true, current_plan, limit_name, current_usage, max_allowed }`
- [ ] Usage reset on billing cycle start
- [ ] Cron job: daily usage snapshot for historical tracking

---

## TASK-070: Plan Selection Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-066

### Acceptance Criteria
- [ ] Pricing cards: Free, Pro, Business, Enterprise
- [ ] Feature comparison table
- [ ] Monthly/Yearly toggle (yearly = discount)
- [ ] Current plan highlighted
- [ ] "Upgrade" / "Downgrade" / "Current Plan" buttons
- [ ] Checkout redirect → Stripe → back to billing page
- [ ] Enterprise: "Contact Us" button

---

## TASK-071: Billing Dashboard Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-070

### Acceptance Criteria
- [ ] Current plan card: name, price, renewal date, status
- [ ] Usage meters: social accounts (X/Y), clients (X/Y), posts (X/Y), AI credits (X/Y), storage (X/Y GB)
- [ ] Progress bars with color coding (green → yellow → red)
- [ ] Invoice history list: date, amount, status, PDF download
- [ ] "Manage Subscription" → Stripe Customer Portal
- [ ] "Change Plan" → plan selection page
- [ ] Cancel subscription button with confirmation

---

## TASK-072: Plan Limit Enforcement UI

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-071, TASK-069

### Acceptance Criteria
- [ ] Warning banners when approaching limits (80%+)
- [ ] Block UI when limit reached + upgrade prompt modal
- [ ] "Upgrade to unlock" inline prompts near disabled features
- [ ] Upgrade CTA in sidebar when on Free plan
- [ ] Toast notification when action blocked by limit
