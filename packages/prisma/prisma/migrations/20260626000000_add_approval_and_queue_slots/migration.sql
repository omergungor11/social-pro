-- Add PENDING_APPROVAL state to the PostStatus enum (positioned after DRAFT)
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' AFTER 'DRAFT';

-- New notification types for the approval workflow
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_DECISION';

-- Track when an approval decision was made
ALTER TABLE "PostApproval" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Recurring posting time slots used by bulk scheduling ("queue")
CREATE TABLE "PostingSlot" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostingSlot_agencyId_isActive_idx" ON "PostingSlot"("agencyId", "isActive");

ALTER TABLE "PostingSlot" ADD CONSTRAINT "PostingSlot_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostingSlot" ADD CONSTRAINT "PostingSlot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
