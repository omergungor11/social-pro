import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Low-level S3 storage abstraction.
 *
 * All configuration is read from environment variables so the service is
 * fully portable across AWS, MinIO, and any S3-compatible endpoint.
 *
 * Environment variables:
 *   S3_ENDPOINT    — base URL (e.g. https://s3.us-east-1.amazonaws.com)
 *   S3_REGION      — region (e.g. us-east-1)
 *   S3_BUCKET      — bucket name
 *   S3_ACCESS_KEY  — access key ID
 *   S3_SECRET_KEY  — secret access key
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;

  private get bucket(): string {
    const b = process.env["S3_BUCKET"];
    if (!b) throw new InternalServerErrorException("S3_BUCKET is not configured");
    return b;
  }

  private get endpoint(): string {
    return process.env["S3_ENDPOINT"] ?? "";
  }

  constructor() {
    const endpoint = process.env["S3_ENDPOINT"];
    const region = process.env["S3_REGION"] ?? "us-east-1";
    const accessKeyId = process.env["S3_ACCESS_KEY"] ?? "";
    const secretAccessKey = process.env["S3_SECRET_KEY"] ?? "";

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /**
   * Uploads a buffer directly to S3.
   *
   * @param key         Object key inside the bucket
   * @param buffer      File content
   * @param contentType MIME type (e.g. "image/jpeg")
   */
  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );
      this.logger.debug(`Uploaded object: key=${key} contentType=${contentType}`);
    } catch (err) {
      this.logger.error(`S3 upload failed: key=${key} error=${String(err)}`);
      throw new InternalServerErrorException("Failed to upload file to storage");
    }
  }

  /**
   * Deletes an object from S3.
   *
   * @param key Object key inside the bucket
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
      this.logger.debug(`Deleted object: key=${key}`);
    } catch (err) {
      this.logger.error(`S3 delete failed: key=${key} error=${String(err)}`);
      throw new InternalServerErrorException("Failed to delete file from storage");
    }
  }

  /**
   * Generates a presigned PUT URL valid for `expiresIn` seconds.
   * The client uses this URL to upload the file directly to S3.
   *
   * @param key         Object key inside the bucket
   * @param contentType Expected MIME type (enforced by the presigned URL)
   * @param expiresIn   Validity in seconds (default 3600)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (err) {
      this.logger.error(`Failed to generate presigned URL: key=${key} error=${String(err)}`);
      throw new InternalServerErrorException("Failed to generate upload URL");
    }
  }

  /**
   * Constructs the public URL for an object.
   *
   * When a custom endpoint is set (MinIO / DigitalOcean Spaces) the URL is
   * built as `{endpoint}/{bucket}/{key}`. For standard AWS the SDK-style
   * URL `https://{bucket}.s3.{region}.amazonaws.com/{key}` is used.
   *
   * @param key Object key inside the bucket
   */
  getPublicUrl(key: string): string {
    // Explicit public base URL — required for Cloudflare R2, whose S3 API
    // endpoint is NOT publicly readable. Set this to the bucket's public
    // r2.dev URL or a custom domain (e.g. https://pub-xxxx.r2.dev). The key is
    // appended directly since that base already maps to the bucket root.
    const publicBase = process.env["S3_PUBLIC_URL"];
    if (publicBase) {
      return `${publicBase.replace(/\/$/, "")}/${key}`;
    }

    const endpoint = this.endpoint;
    if (endpoint) {
      const base = endpoint.replace(/\/$/, "");
      return `${base}/${this.bucket}/${key}`;
    }

    const region = process.env["S3_REGION"] ?? "us-east-1";
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Builds the canonical S3 object key for an asset.
   *
   * Format: `{agencyId}/{type}/{year}/{month}/{filename}`
   *
   * @param agencyId Agency that owns the asset
   * @param type     Asset category (e.g. "image", "video")
   * @param filename Final segment of the key (typically a UUID + extension)
   */
  static buildKey(agencyId: string, type: string, filename: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${agencyId}/${type}/${year}/${month}/${filename}`;
  }
}
