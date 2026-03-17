import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { S3StorageService } from "./services/s3-storage.service";

/**
 * Media module.
 *
 * Provides file upload and storage capabilities backed by S3 (or any
 * S3-compatible service like MinIO).
 *
 * Responsibilities:
 *  - Multipart file uploads via Multer
 *  - Presigned PUT URLs for direct browser-to-S3 uploads
 *  - File deletion (S3 object + PostMedia record)
 *  - MIME type validation and per-type size limits
 *
 * Environment variables required:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY
 *   S3_ENDPOINT (optional — for non-AWS S3-compatible services)
 */
@Module({
  imports: [PrismaModule],
  controllers: [MediaController],
  providers: [MediaService, S3StorageService],
  exports: [MediaService, S3StorageService],
})
export class MediaModule {}
