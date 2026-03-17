# Phase 4: Media Upload & Storage

## TASK-035: S3 Storage Service + MinIO

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-005

### Acceptance Criteria
- [ ] S3 client service (AWS SDK v3) — works with both S3 and MinIO
- [ ] Configuration: bucket name, region, endpoint (MinIO for dev, S3 for prod)
- [ ] Methods: upload, delete, getPresignedUrl, getPublicUrl
- [ ] MinIO docker config with auto-created default bucket
- [ ] Folder structure: `{agency_id}/{type}/{year}/{month}/{filename}`

---

## TASK-036: Media Module

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-035, TASK-011

### Acceptance Criteria
- [ ] `POST /api/v1/media/upload` — multipart file upload
- [ ] `POST /api/v1/media/presigned-url` — get pre-signed upload URL for large files
- [ ] `DELETE /api/v1/media/:id` — delete media
- [ ] File validation: max 50MB image, 500MB video, allowed MIME types
- [ ] Virus scan placeholder (interface for future integration)
- [ ] Tenant-scoped storage paths
- [ ] Return: id, url, thumbnail_url, type, size

---

## TASK-037: Image Processing Job

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-036

### Acceptance Criteria
- [ ] BullMQ job triggered after image upload
- [ ] Resize to platform-specific dimensions (Twitter: 1200x675, Instagram: 1080x1080, etc.)
- [ ] Generate thumbnail (300x300)
- [ ] Optimize file size (sharp library)
- [ ] Store all variants in S3
- [ ] Update media record with variant URLs

---

## TASK-038: Video Processing Job

**Agent**: backend
**Complexity**: L
**Status**: PENDING
**Dependencies**: TASK-036

### Acceptance Criteria
- [ ] BullMQ job triggered after video upload
- [ ] Extract thumbnail frame
- [ ] Transcode to MP4 H.264 (ffmpeg) if needed
- [ ] Validate duration limits per platform
- [ ] Store processed video + thumbnail in S3
- [ ] Progress tracking for long videos

---

## TASK-039: Media Upload UI Component

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-036

### Acceptance Criteria
- [ ] Drag-and-drop upload zone
- [ ] Click to browse files
- [ ] Upload progress bar
- [ ] Image preview (thumbnail)
- [ ] Video preview (thumbnail + duration)
- [ ] Multiple file upload support
- [ ] Remove uploaded file
- [ ] File type + size validation (client-side)
- [ ] Reusable component (used in post creation, profile, etc.)
