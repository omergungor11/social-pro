import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { MediaType } from "@social-pro/prisma";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../common/prisma/prisma.service";
import { S3StorageService } from "./services/s3-storage.service";
import { PresignedUrlResponseDto } from "./dto/presigned-url.dto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
]);

const DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALL_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
]);

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;   // 50 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;  // 500 MB
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

// ---------------------------------------------------------------------------
// DTOs / interfaces
// ---------------------------------------------------------------------------

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadFileResult {
  url: string;
  storageKey: string;
  type: MediaType;
  size: number;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService
  ) {}

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  /**
   * Validates, uploads and persists a media file.
   *
   * @param agencyId Agency that owns the upload
   * @param file     In-memory file from Multer
   */
  async upload(agencyId: string, file: UploadFileInput): Promise<UploadFileResult> {
    const mediaType = this.resolveMediaType(file.mimeType);
    this.validateSize(file.size, mediaType);

    const ext = extname(file.originalName).toLowerCase() || this.fallbackExtension(file.mimeType);
    const filename = `${randomUUID()}${ext}`;
    const storageKey = S3StorageService.buildKey(
      agencyId,
      mediaType.toLowerCase(),
      filename
    );

    await this.s3.upload(storageKey, file.buffer, file.mimeType);

    const url = this.s3.getPublicUrl(storageKey);

    this.logger.log(
      `Media uploaded: agencyId=${agencyId} key=${storageKey} type=${mediaType} size=${file.size}`
    );

    return { url, storageKey, type: mediaType, size: file.size, mimeType: file.mimeType };
  }

  // ---------------------------------------------------------------------------
  // Presigned URL
  // ---------------------------------------------------------------------------

  /**
   * Issues a presigned PUT URL for large-file direct uploads from the browser.
   *
   * @param agencyId    Agency that owns the upload
   * @param filename    Original filename (used for extension + key)
   * @param contentType MIME type of the file to upload
   * @param expiresIn   URL validity in seconds
   */
  async getPresignedUrl(
    agencyId: string,
    filename: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<PresignedUrlResponseDto> {
    this.resolveMediaType(contentType); // validate MIME type

    const ext = extname(filename).toLowerCase() || this.fallbackExtension(contentType);
    const uniqueFilename = `${randomUUID()}${ext}`;
    const storageKey = S3StorageService.buildKey(
      agencyId,
      this.resolveMediaType(contentType).toLowerCase(),
      uniqueFilename
    );

    const uploadUrl = await this.s3.getPresignedUploadUrl(storageKey, contentType, expiresIn);
    const publicUrl = this.s3.getPublicUrl(storageKey);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    this.logger.debug(
      `Presigned URL issued: agencyId=${agencyId} key=${storageKey} expiresIn=${expiresIn}s`
    );

    return { uploadUrl, storageKey, publicUrl, expiresAt };
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /**
   * Deletes an object from S3 by storage key.
   *
   * @param storageKey The S3 object key returned by upload / presigned-url
   */
  async delete(storageKey: string): Promise<void> {
    await this.s3.delete(storageKey);
    this.logger.log(`Media deleted: key=${storageKey}`);
  }

  /**
   * Deletes a PostMedia record and removes the underlying S3 object.
   *
   * @param agencyId   Agency scope guard
   * @param mediaId    PostMedia row id
   */
  async deletePostMedia(agencyId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.postMedia.findUnique({
      where: { id: mediaId },
      include: { post: { select: { agencyId: true } } },
    });

    if (!media || media.post.agencyId !== agencyId) {
      throw new NotFoundException(`Media '${mediaId}' not found`);
    }

    if (media.storageKey) {
      await this.s3.delete(media.storageKey);
    }

    await this.prisma.postMedia.delete({ where: { id: mediaId } });

    this.logger.log(`PostMedia deleted: id=${mediaId} agencyId=${agencyId}`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveMediaType(mimeType: string): MediaType {
    if (!ALL_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type '${mimeType}'. Allowed: images, videos, documents.`
      );
    }

    if (mimeType === "image/gif") return MediaType.GIF;
    if (IMAGE_MIME_TYPES.has(mimeType)) return MediaType.IMAGE;
    if (VIDEO_MIME_TYPES.has(mimeType)) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }

  private validateSize(size: number, type: MediaType): void {
    const limits: Record<MediaType, number> = {
      [MediaType.IMAGE]: MAX_IMAGE_BYTES,
      [MediaType.GIF]: MAX_IMAGE_BYTES,
      [MediaType.VIDEO]: MAX_VIDEO_BYTES,
      [MediaType.DOCUMENT]: MAX_DOCUMENT_BYTES,
    };

    const limit = limits[type];
    if (size > limit) {
      const limitMb = Math.round(limit / (1024 * 1024));
      throw new BadRequestException(
        `File size ${Math.round(size / (1024 * 1024))} MB exceeds the ${limitMb} MB limit for ${type}`
      );
    }
  }

  private fallbackExtension(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "video/mp4": ".mp4",
      "video/mpeg": ".mpeg",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/webm": ".webm",
      "application/pdf": ".pdf",
    };
    return map[mimeType] ?? "";
  }
}
