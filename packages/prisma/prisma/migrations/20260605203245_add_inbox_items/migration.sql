-- CreateEnum
CREATE TYPE "InboxItemType" AS ENUM ('COMMENT', 'REPLY', 'MENTION', 'DIRECT_MESSAGE');

-- CreateEnum
CREATE TYPE "InboxItemStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "type" "InboxItemType" NOT NULL,
    "status" "InboxItemStatus" NOT NULL DEFAULT 'UNREAD',
    "platformItemId" TEXT NOT NULL,
    "parentPlatformId" TEXT,
    "platformPostId" TEXT,
    "postId" TEXT,
    "authorPlatformId" TEXT,
    "authorName" TEXT,
    "authorUsername" TEXT,
    "authorAvatarUrl" TEXT,
    "text" TEXT,
    "permalink" TEXT,
    "isOutbound" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "platformCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxItem_agencyId_status_idx" ON "InboxItem"("agencyId", "status");

-- CreateIndex
CREATE INDEX "InboxItem_agencyId_platform_idx" ON "InboxItem"("agencyId", "platform");

-- CreateIndex
CREATE INDEX "InboxItem_agencyId_type_idx" ON "InboxItem"("agencyId", "type");

-- CreateIndex
CREATE INDEX "InboxItem_socialAccountId_idx" ON "InboxItem"("socialAccountId");

-- CreateIndex
CREATE INDEX "InboxItem_parentPlatformId_idx" ON "InboxItem"("parentPlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxItem_socialAccountId_platformItemId_key" ON "InboxItem"("socialAccountId", "platformItemId");

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
