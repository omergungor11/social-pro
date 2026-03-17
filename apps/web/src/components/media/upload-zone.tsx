'use client';

import * as React from 'react';
import { Upload, X, Image, Video, File } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadedFile {
  id: string;
  file: File;
  preview: string | null;
  progress: number;
  error: string | null;
}

export interface UploadZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_ACCEPT: string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideo(file: File): boolean {
  return file.type.startsWith('video/');
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// FilePreview sub-component
// ---------------------------------------------------------------------------

interface FilePreviewProps {
  uploadedFile: UploadedFile;
  onRemove: (id: string) => void;
}

function FilePreview({ uploadedFile, onRemove }: FilePreviewProps): React.JSX.Element {
  const { id, file, preview, progress, error } = uploadedFile;
  const videoFile = isVideo(file);
  const imageFile = isImage(file);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg border bg-white p-3 transition-colors',
        error !== null
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 hover:border-slate-300'
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {imageFile && preview !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : videoFile ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-slate-800">
            <Video className="h-5 w-5 text-slate-300" />
            <span className="text-[10px] text-slate-400">Video</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {imageFile ? (
              <Image className="h-6 w-6 text-slate-400" />
            ) : (
              <File className="h-6 w-6 text-slate-400" />
            )}
          </div>
        )}
      </div>

      {/* Info + progress */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800" title={file.name}>
          {file.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{formatBytes(file.size)}</p>

        {error !== null ? (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        ) : progress < 100 ? (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-[11px] text-slate-400">{progress}%</p>
          </div>
        ) : (
          <p className="mt-1 text-xs font-medium text-emerald-600">Ready</p>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(id)}
        className={cn(
          'shrink-0 rounded-md p-1 transition-colors',
          'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
          'opacity-0 group-hover:opacity-100 focus:opacity-100'
        )}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UploadZone
// ---------------------------------------------------------------------------

export function UploadZone({
  onFilesChange,
  maxFiles = 10,
  acceptTypes = DEFAULT_ACCEPT,
  maxSizeMB = 50,
  className,
}: UploadZoneProps): React.JSX.Element {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  // Notify parent whenever files change
  React.useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

  // Simulate upload progress for a file
  function simulateUpload(id: string): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress } : f))
      );
    }, 150);
  }

  function validateFile(file: File): string | null {
    if (!acceptTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported.`;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File exceeds the ${maxSizeMB} MB size limit.`;
    }
    return null;
  }

  function processFiles(incoming: FileList | File[]): void {
    const incomingArray = Array.from(incoming);
    const remaining = maxFiles - files.length;
    if (remaining <= 0) return;

    const toProcess = incomingArray.slice(0, remaining);

    const newEntries: UploadedFile[] = toProcess.map((file) => {
      const error = validateFile(file);
      let preview: string | null = null;

      if (error === null && isImage(file)) {
        preview = URL.createObjectURL(file);
      }

      return {
        id: generateId(),
        file,
        preview,
        progress: error !== null ? 100 : 0,
        error,
      };
    });

    setFiles((prev) => {
      const next = [...prev, ...newEntries];
      return next;
    });

    // Kick off simulated upload for valid files
    newEntries.forEach((entry) => {
      if (entry.error === null) {
        simulateUpload(entry.id);
      }
    });
  }

  function handleRemove(id: string): void {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview !== null && target?.preview !== undefined) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input so same file can be re-added after removal
      e.target.value = '';
    }
  }

  const atCapacity = files.length >= maxFiles;
  const acceptString = acceptTypes.join(',');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      {!atCapacity && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload files — drag and drop or click to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-3',
            'rounded-xl border-2 border-dashed px-6 py-10 text-center',
            'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              isDragging
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-200 text-slate-500'
            )}
          >
            <Upload className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-700">
              {isDragging ? 'Drop files here' : 'Drag files here or click to browse'}
            </p>
            <p className="text-xs text-slate-500">
              Supports images and videos up to {maxSizeMB} MB
              {maxFiles < 999 && ` · Max ${maxFiles} files`}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={acceptString}
            onChange={handleInputChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}

      {atCapacity && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm text-amber-700">
            Maximum of {maxFiles} file{maxFiles !== 1 ? 's' : ''} reached.
            Remove a file to add more.
          </p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <FilePreview key={f.id} uploadedFile={f} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
