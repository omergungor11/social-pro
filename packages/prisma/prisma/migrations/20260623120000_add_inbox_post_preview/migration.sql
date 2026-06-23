-- Add post-context snapshot columns to InboxItem so the inbox UI can show
-- which post a comment/mention belongs to without an extra platform lookup.
ALTER TABLE "InboxItem" ADD COLUMN "postPreviewText" TEXT;
ALTER TABLE "InboxItem" ADD COLUMN "postPreviewImageUrl" TEXT;
ALTER TABLE "InboxItem" ADD COLUMN "postPermalink" TEXT;
