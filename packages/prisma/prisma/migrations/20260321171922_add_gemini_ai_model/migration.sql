-- AlterEnum
ALTER TYPE "AiModel" ADD VALUE 'GEMINI';

-- CreateTable
CREATE TABLE "RawWebhookEvent" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "eventType" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawWebhookEvent_platform_createdAt_idx" ON "RawWebhookEvent"("platform", "createdAt");
