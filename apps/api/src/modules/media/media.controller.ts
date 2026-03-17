import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { MediaService, UploadFileResult } from "./media.service";
import { PresignedUrlRequestDto, PresignedUrlResponseDto } from "./dto/presigned-url.dto";
import { UploadMediaDto } from "./dto/upload-media.dto";

@ApiTags("Media")
@ApiBearerAuth()
@Controller("media")
@UseGuards(RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ---------------------------------------------------------------------------
  // Multipart upload
  // ---------------------------------------------------------------------------

  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB hard cap at transport layer
    })
  )
  @ApiOperation({
    summary: "Upload a media file",
    description:
      "Accepts a multipart/form-data upload and stores the file in S3. " +
      "Returns the public URL and storage key. " +
      "Images are limited to 50 MB, videos to 500 MB.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary", description: "File to upload" },
        altText: { type: "string", description: "Alternative text for images" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "File uploaded successfully" })
  @ApiResponse({ status: 400, description: "Unsupported file type or size exceeded" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async upload(
    @CurrentAgency() agencyId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() _dto: UploadMediaDto
  ): Promise<UploadFileResult> {
    if (!file) {
      throw new BadRequestException("No file provided in the request");
    }

    return this.mediaService.upload(agencyId, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  // ---------------------------------------------------------------------------
  // Presigned URL for large-file direct uploads
  // ---------------------------------------------------------------------------

  @Post("presigned-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a presigned URL for direct S3 upload",
    description:
      "Returns a presigned PUT URL that the client can use to upload a file " +
      "directly to S3, bypassing the API server. Useful for large files. " +
      "After upload, use the returned storageKey when creating PostMedia.",
  })
  @ApiResponse({ status: 200, description: "Presigned URL generated" })
  @ApiResponse({ status: 400, description: "Unsupported content type" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getPresignedUrl(
    @CurrentAgency() agencyId: string,
    @Body() dto: PresignedUrlRequestDto
  ): Promise<PresignedUrlResponseDto> {
    return this.mediaService.getPresignedUrl(
      agencyId,
      dto.filename,
      dto.contentType,
      dto.expiresIn
    );
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a media attachment",
    description:
      "Removes the PostMedia record and deletes the underlying file from S3. " +
      "The media must belong to a post owned by the current agency.",
  })
  @ApiParam({ name: "id", description: "PostMedia ID" })
  @ApiResponse({ status: 204, description: "Media deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Media not found" })
  async delete(
    @CurrentAgency() agencyId: string,
    @Param("id") mediaId: string
  ): Promise<void> {
    return this.mediaService.deletePostMedia(agencyId, mediaId);
  }
}
