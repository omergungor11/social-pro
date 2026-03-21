'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostPreviewProps {
  content: string;
  platform: Platform;
  /** Single media URL (backward compat) */
  media?: string | null;
  /** Multiple media URLs */
  mediaList?: string[];
  authorName?: string;
  authorHandle?: string;
}

// ---------------------------------------------------------------------------
// Multi-image grid component
// ---------------------------------------------------------------------------

function MediaGrid({ images }: { images: string[] }): React.JSX.Element {
  if (images.length === 0) return <></>;
  if (images.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={images[0]} alt="Post media" className="w-full rounded-xl object-cover" style={{ maxHeight: '280px' }} />
    );
  }
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="w-full aspect-square object-cover" />
        ))}
      </div>
    );
  }
  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="w-full aspect-square object-cover row-span-2" />
        <div className="grid grid-rows-2 gap-0.5">
          {images.slice(1).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="w-full aspect-[2/1] object-cover" />
          ))}
        </div>
      </div>
    );
  }
  // 4+
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full aspect-square object-cover" />
          {i === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-lg font-bold">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Resolve media props to a list of URLs */
function resolveMedia(media?: string | null, mediaList?: string[]): string[] {
  if (mediaList && mediaList.length > 0) return mediaList;
  if (media) return [media];
  return [];
}

// ---------------------------------------------------------------------------
// Platform character limits
// ---------------------------------------------------------------------------

export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  tiktok: 2200,
  youtube: 5000,
};

// ---------------------------------------------------------------------------
// Twitter / X preview
// ---------------------------------------------------------------------------

function TwitterPreview({
  content,
  media,
  mediaList,
  authorName,
  authorHandle,
}: Omit<PostPreviewProps, 'platform'>): React.JSX.Element {
  const images = resolveMedia(media, mediaList);
  const truncated = content.slice(0, PLATFORM_CHAR_LIMITS.twitter);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 font-sans shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-900">
              {authorName ?? 'Your Name'}
            </span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#1D9BF0]" fill="currentColor" aria-hidden="true">
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1.01-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2c-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1.01 1.01-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1.01 2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22c1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1.01-1.01 1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12Z" />
            </svg>
          </div>
          <span className="text-xs text-slate-500">@{authorHandle ?? 'yourhandle'}</span>
        </div>
        {/* X logo */}
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-900" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.25 2.25h6.865l4.265 5.638L18.244 2.25ZM17.086 19.77h1.834L7.005 4.126H5.032L17.086 19.77Z" />
        </svg>
      </div>

      {/* Content */}
      {content.length > 0 && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
          {truncated}
          {content.length > PLATFORM_CHAR_LIMITS.twitter && (
            <span className="text-red-500">…</span>
          )}
        </p>
      )}
      {content.length === 0 && (
        <p className="mt-3 text-sm italic text-slate-400">Your tweet will appear here…</p>
      )}

      {/* Media */}
      {images.length > 0 && (
        <div className="mt-3">
          <MediaGrid images={images} />
        </div>
      )}

      {/* Engagement bar */}
      <div className="mt-3 flex items-center gap-5 border-t border-slate-100 pt-2 text-slate-400">
        {[
          { label: 'Reply', path: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 7.879 3.584 7.879 8 0 3.94-2.556 7.32-6.101 8.287l-.805.19v1.697c0 .82-.822 1.33-1.543.969L8.06 17.863c-.194-.097-.4-.153-.61-.153H9.756C5.33 17.71 1.751 14.131 1.751 10Z' },
          { label: 'Retweet', path: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88ZM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2Z' },
          { label: 'Like', path: 'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91Z' },
        ].map(({ label, path }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="flex items-center gap-1.5 text-xs hover:text-blue-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d={path} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Instagram preview
// ---------------------------------------------------------------------------

function InstagramPreview({
  content,
  media,
  mediaList,
  authorName,
}: Omit<PostPreviewProps, 'platform'>): React.JSX.Element {
  const images = resolveMedia(media, mediaList);
  const truncated = content.slice(0, 125);
  const hasMore = content.length > 125;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="h-8 w-8 shrink-0 rounded-full p-0.5"
          style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
        >
          <div className="h-full w-full rounded-full bg-white p-0.5">
            <div className="h-full w-full rounded-full bg-slate-200" />
          </div>
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-900">
          {authorName ?? 'your_account'}
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
      </div>

      {/* Image area */}
      {images.length > 0 ? (
        images.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt="Post media" className="aspect-square w-full object-cover" />
        ) : (
          <div className="relative aspect-square w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt="" className="h-full w-full object-cover" />
            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
              1/{images.length}
            </div>
            {/* Carousel dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <div key={i} className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-blue-500' : 'bg-white/60')} />
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="aspect-square w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
        {[
          'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
          'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
          'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
        ].map((path, i) => (
          <button
            key={i}
            type="button"
            className="text-slate-800 hover:text-slate-500 transition-colors"
            aria-label={['Like', 'Comment', 'Share'][i]}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d={path} />
            </svg>
          </button>
        ))}
        <button type="button" className="ml-auto text-slate-800 hover:text-slate-500" aria-label="Save">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        {content.length > 0 ? (
          <p className="text-sm text-slate-900">
            <span className="font-semibold">{authorName ?? 'your_account'} </span>
            {truncated}
            {hasMore && <span className="text-slate-400"> … more</span>}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">Caption will appear here…</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkedIn preview
// ---------------------------------------------------------------------------

function LinkedInPreview({
  content,
  media,
  mediaList,
  authorName,
}: Omit<PostPreviewProps, 'platform'>): React.JSX.Element {
  const images = resolveMedia(media, mediaList);
  const truncated = content.slice(0, 200);
  const hasMore = content.length > 200;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-blue-700 to-blue-900" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{authorName ?? 'Your Name'}</p>
          <p className="text-xs text-slate-500">Your Title at Company</p>
          <p className="mt-0.5 text-xs text-slate-400">Just now · <span aria-hidden="true">🌐</span></p>
        </div>
        <button type="button" className="ml-auto text-[#0A66C2] text-sm font-semibold hover:underline" aria-label="Follow">
          + Follow
        </button>
      </div>

      {/* Content */}
      <div className="mt-3">
        {content.length > 0 ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {truncated}
            {hasMore && <span className="text-[#0A66C2] cursor-pointer"> …see more</span>}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">Your post will appear here…</p>
        )}
      </div>

      {/* Media */}
      {images.length > 0 && (
        <div className="mt-3">
          <MediaGrid images={images} />
        </div>
      )}

      {/* Engagement */}
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
        {[
          { label: 'Like', icon: '👍' },
          { label: 'Comment', icon: '💬' },
          { label: 'Repost', icon: '🔁' },
          { label: 'Send', icon: '✈️' },
        ].map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Facebook preview
// ---------------------------------------------------------------------------

function FacebookPreview({
  content,
  media,
  mediaList,
  authorName,
}: Omit<PostPreviewProps, 'platform'>): React.JSX.Element {
  const images = resolveMedia(media, mediaList);
  const truncated = content.slice(0, 250);
  const hasMore = content.length > 250;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-sans">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{authorName ?? 'Your Page'}</p>
          <p className="text-xs text-slate-500">Just now · <span aria-hidden="true">🌐</span></p>
        </div>
        <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
      </div>

      <div className="mt-2">
        {content.length > 0 ? (
          <p className="whitespace-pre-wrap text-sm text-slate-900">
            {truncated}
            {hasMore && <span className="text-[#1877F2] cursor-pointer"> See more</span>}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">Your post will appear here…</p>
        )}
      </div>

      {images.length > 0 && (
        <div className="mt-3 -mx-4 w-[calc(100%+2rem)]">
          {images.length === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="Post media" className="w-full object-cover" style={{ maxHeight: '240px' }} />
          ) : (
            <div className="px-4"><MediaGrid images={images} /></div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2">
        {[
          { label: 'Like', color: 'text-[#1877F2]' },
          { label: 'Comment', color: 'text-slate-500' },
          { label: 'Share', color: 'text-slate-500' },
        ].map(({ label, color }) => (
          <button
            key={label}
            type="button"
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold hover:bg-slate-100 transition-colors', color)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic / TikTok / YouTube preview
// ---------------------------------------------------------------------------

function GenericPreview({
  content,
  media,
  mediaList,
  platform,
  authorName,
}: Omit<PostPreviewProps, 'platform'> & { platform: Platform }): React.JSX.Element {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const truncated = content.slice(0, limit);
  const hasMore = content.length > limit;
  const images = resolveMedia(media, mediaList);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-3">
        <PlatformIcon platform={platform} size="sm" />
        <div>
          <p className="text-sm font-semibold text-slate-900">{authorName ?? 'Your Account'}</p>
          <p className="text-xs text-slate-500">{getPlatformLabel(platform)}</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mb-3">
          <MediaGrid images={images} />
        </div>
      )}

      {content.length > 0 ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {truncated}
          {hasMore && <span className="text-slate-400">…</span>}
        </p>
      ) : (
        <p className="text-sm italic text-slate-400">Your {getPlatformLabel(platform)} post will appear here…</p>
      )}

      <div className="mt-2 text-right">
        <span className={cn(
          'text-xs',
          content.length > limit ? 'text-red-500 font-medium' : 'text-slate-400'
        )}>
          {content.length} / {limit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostPreview (main export)
// ---------------------------------------------------------------------------

export function PostPreview({
  content,
  platform,
  media,
  mediaList,
  authorName,
  authorHandle,
}: PostPreviewProps): React.JSX.Element {
  const props = { content, media, mediaList, authorName, authorHandle };

  switch (platform) {
    case 'twitter':
      return <TwitterPreview {...props} />;
    case 'instagram':
      return <InstagramPreview {...props} />;
    case 'linkedin':
      return <LinkedInPreview {...props} />;
    case 'facebook':
      return <FacebookPreview {...props} />;
    default:
      return <GenericPreview {...props} platform={platform} />;
  }
}

// ---------------------------------------------------------------------------
// Re-export limits helper
// ---------------------------------------------------------------------------

export { PLATFORM_CHAR_LIMITS as charLimits };
