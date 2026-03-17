-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'YOUTUBE');
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');
CREATE TYPE "PostTargetStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'GIF', 'DOCUMENT');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PlanInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "AiModel" AS ENUM ('CLAUDE', 'OPENAI');
CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE "MetricType" AS ENUM ('FOLLOWERS', 'ENGAGEMENT', 'IMPRESSIONS', 'REACH', 'CLICKS', 'LIKES', 'COMMENTS', 'SHARES', 'SAVES', 'VIEWS', 'WATCH_TIME');
CREATE TYPE "UsageMetric" AS ENUM ('POSTS_PUBLISHED', 'AI_GENERATIONS', 'STORAGE_BYTES', 'SOCIAL_ACCOUNTS', 'CLIENTS', 'TEAM_MEMBERS');
CREATE TYPE "NotificationType" AS ENUM ('POST_PUBLISHED', 'POST_FAILED', 'INVITATION', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ACCOUNT_DISCONNECT', 'LIMIT_WARNING', 'REPORT_READY');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateTable: Agency
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AgencyMember
CREATE TABLE "AgencyMember" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Invitation
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Client
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClientGroup
CREATE TABLE "ClientGroup" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClientGroupMembership
CREATE TABLE "ClientGroupMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SocialAccount
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformUsername" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Post
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PostMedia
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "altText" TEXT,
    "storageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PostTarget
CREATE TABLE "PostTarget" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "status" "PostTargetStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "platformSpecificContent" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PostApproval
CREATE TABLE "PostApproval" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AiGeneration
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" JSONB,
    "model" "AiModel" NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContentTemplate
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "SocialPlatform",
    "template" JSONB NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnalyticsSnapshot
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "postTargetId" TEXT,
    "metricType" "MetricType" NOT NULL,
    "value" BIGINT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "rawData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnalyticsReport
CREATE TABLE "AnalyticsReport" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "generatedData" JSONB,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "interval" "PlanInterval" NOT NULL,
    "maxSocialAccounts" INTEGER NOT NULL DEFAULT 3,
    "maxClients" INTEGER NOT NULL DEFAULT 10,
    "maxTeamMembers" INTEGER NOT NULL DEFAULT 2,
    "maxScheduledPostsPerMonth" INTEGER NOT NULL DEFAULT 30,
    "aiCreditsPerMonth" INTEGER NOT NULL DEFAULT 50,
    "storageLimitGb" INTEGER NOT NULL DEFAULT 1,
    "features" JSONB NOT NULL DEFAULT '{}',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BillingEvent
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UsageRecord
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationPreference
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");
CREATE UNIQUE INDEX "Agency_stripeCustomerId_key" ON "Agency"("stripeCustomerId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "AgencyMember_agencyId_userId_key" ON "AgencyMember"("agencyId", "userId");
CREATE INDEX "AgencyMember_agencyId_idx" ON "AgencyMember"("agencyId");
CREATE INDEX "AgencyMember_userId_idx" ON "AgencyMember"("userId");
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_agencyId_idx" ON "Invitation"("agencyId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Client_agencyId_name_idx" ON "Client"("agencyId", "name");
CREATE INDEX "Client_agencyId_email_idx" ON "Client"("agencyId", "email");
CREATE INDEX "ClientGroup_agencyId_idx" ON "ClientGroup"("agencyId");
CREATE UNIQUE INDEX "ClientGroupMembership_clientId_groupId_key" ON "ClientGroupMembership"("clientId", "groupId");
CREATE UNIQUE INDEX "SocialAccount_agencyId_platform_platformUserId_key" ON "SocialAccount"("agencyId", "platform", "platformUserId");
CREATE INDEX "SocialAccount_agencyId_idx" ON "SocialAccount"("agencyId");
CREATE INDEX "SocialAccount_agencyId_platform_idx" ON "SocialAccount"("agencyId", "platform");
CREATE INDEX "Post_agencyId_status_idx" ON "Post"("agencyId", "status");
CREATE INDEX "Post_agencyId_scheduledAt_idx" ON "Post"("agencyId", "scheduledAt");
CREATE INDEX "Post_agencyId_clientId_idx" ON "Post"("agencyId", "clientId");
CREATE INDEX "PostMedia_postId_idx" ON "PostMedia"("postId");
CREATE INDEX "PostTarget_postId_idx" ON "PostTarget"("postId");
CREATE INDEX "PostTarget_socialAccountId_idx" ON "PostTarget"("socialAccountId");
CREATE INDEX "PostApproval_postId_idx" ON "PostApproval"("postId");
CREATE INDEX "AiGeneration_agencyId_createdAt_idx" ON "AiGeneration"("agencyId", "createdAt");
CREATE INDEX "ContentTemplate_agencyId_idx" ON "ContentTemplate"("agencyId");
CREATE INDEX "AnalyticsSnapshot_socialAccountId_metricType_periodStart_idx" ON "AnalyticsSnapshot"("socialAccountId", "metricType", "periodStart");
CREATE INDEX "AnalyticsReport_agencyId_reportType_idx" ON "AnalyticsReport"("agencyId", "reportType");
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE UNIQUE INDEX "BillingEvent_stripeEventId_key" ON "BillingEvent"("stripeEventId");
CREATE INDEX "BillingEvent_agencyId_idx" ON "BillingEvent"("agencyId");
CREATE INDEX "UsageRecord_agencyId_metric_periodStart_idx" ON "UsageRecord"("agencyId", "metric", "periodStart");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_agencyId_createdAt_idx" ON "Notification"("agencyId", "createdAt");
CREATE UNIQUE INDEX "NotificationPreference_userId_agencyId_channel_type_key" ON "NotificationPreference"("userId", "agencyId", "channel", "type");
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientGroup" ADD CONSTRAINT "ClientGroup_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientGroupMembership" ADD CONSTRAINT "ClientGroupMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientGroupMembership" ADD CONSTRAINT "ClientGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClientGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostTarget" ADD CONSTRAINT "PostTarget_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostApproval" ADD CONSTRAINT "PostApproval_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_postTargetId_fkey" FOREIGN KEY ("postTargetId") REFERENCES "PostTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
