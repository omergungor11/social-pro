'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, MessageCircle, Eye, Share2, Bookmark,
  TrendingUp, Calendar, BarChart3, Loader2, AlertCircle, Repeat2, ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostTarget {
  id: string;
  status: string;
  publishedAt: string | null;
  platformPostId: string | null;
  platformSpecificContent: Record<string, unknown> | null;
  socialAccount: {
    id: string;
    platform: string;
    platformUsername: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isActive: boolean;
  };
}

interface PostMedia {
  id: string;
  url: string;
  type: string;
  sortOrder: number;
}

interface ApiPost {
  id: string;
  title: string;
  content: { text?: string } | string | null;
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  targets: PostTarget[];
  media: PostMedia[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getContentText(content: ApiPost['content']): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content.text ?? '';
}

function getMetric(psc: Record<string, unknown> | null, key: string): number {
  if (!psc) return 0;
  const val = psc[key];
  return typeof val === 'number' ? val : 0;
}

function getMediaUrl(post: ApiPost): string | null {
  if (post.media && post.media.length > 0) {
    return post.media[0]?.url ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PostDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const postId = params.postId as string;

  const [post, setPost] = React.useState<ApiPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<ApiPost>(`/posts/${postId}`);
        if (!cancelled) setPost(data);
      } catch (err: unknown) {
        if (!cancelled) {
          const apiErr = err as { statusCode?: number; message?: string };
          if (apiErr?.statusCode === 404) {
            setError('Post not found.');
          } else {
            setError(apiErr?.message ?? 'Failed to load post.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push(`/dashboard/social-accounts/${accountId}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </button>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-slate-600">{error ?? 'Post not found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const target = post.targets[0] ?? null;
  const psc = target?.platformSpecificContent ?? null;
  const likes = getMetric(psc, 'likes');
  const comments = getMetric(psc, 'comments');
  const shares = getMetric(psc, 'shares');
  const impressions = getMetric(psc, 'impressions');
  const reach = getMetric(psc, 'reach');
  const saves = getMetric(psc, 'saves');
  const contentText = getContentText(post.content);
  const mediaUrl = getMediaUrl(post);
  const publishedDate = post.publishedAt ?? post.scheduledAt ?? post.createdAt;
  const statusLabel = (target?.status ?? post.status).toLowerCase();

  const platform = (target?.socialAccount?.platform ?? '').toLowerCase();
  const isInstagram = platform === 'instagram';
  const isFacebook = platform === 'facebook';
  const isTwitter = platform === 'twitter';
  const isLinkedin = platform === 'linkedin';

  const platformAccent = {
    instagram: 'border-t-pink-500',
    facebook: 'border-t-blue-600',
    twitter: 'border-t-gray-800',
    linkedin: 'border-t-blue-700',
  }[platform] ?? 'border-t-slate-300';

  const platformBadgeClass = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
    facebook: 'bg-blue-600 text-white border-0',
    twitter: 'bg-gray-900 text-white border-0',
    linkedin: 'bg-blue-700 text-white border-0',
  }[platform] ?? '';

  // Twitter and LinkedIn: text-focused layout (full width, no side image)
  const isTextFocused = isTwitter || isLinkedin;
  // Facebook: full-width card style
  const isFullWidth = isFacebook;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/dashboard/social-accounts/${accountId}`)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </button>

      {/* Main layout */}
      <div className={cn(
        'grid gap-6',
        (isTextFocused || isFullWidth) ? 'lg:grid-cols-1 max-w-2xl' : 'lg:grid-cols-5',
      )}>
        {/* Post image -- left column (Instagram default) or top (Facebook/Twitter/LinkedIn) */}
        <div className={cn((isTextFocused || isFullWidth) ? '' : 'lg:col-span-2')}>
          <div className={cn(
            'rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm',
            !isTextFocused && !isFullWidth && 'sticky top-24',
            `border-t-2 ${platformAccent}`,
          )}>
            {/* For Twitter: show text content first, then image */}
            {isTwitter && contentText && (
              <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  {target?.socialAccount?.avatarUrl && (
                    <img src={target.socialAccount.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900">{target?.socialAccount?.displayName ?? ''}</p>
                    <p className="text-xs text-slate-500">@{target?.socialAccount?.platformUsername ?? ''}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{contentText}</p>
              </div>
            )}

            {mediaUrl ? (
              <img src={mediaUrl} alt="" className={cn(
                'w-full object-cover',
                isInstagram && 'aspect-[4/5]',
                isTwitter && 'rounded-lg mx-4 mb-2 w-[calc(100%-2rem)]',
                (isFacebook || isLinkedin) && 'aspect-video',
              )} />
            ) : !isTwitter ? (
              <div className={cn(
                'w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm',
                isInstagram ? 'aspect-[4/5]' : 'aspect-video',
              )}>
                No media
              </div>
            ) : null}

            <div className="p-4 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-4">
                {isFacebook ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <ThumbsUp className="h-5 w-5 text-blue-600" /> {fmt(likes)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <MessageCircle className="h-5 w-5" /> {fmt(comments)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Share2 className="h-5 w-5" /> {fmt(shares)}
                    </span>
                  </>
                ) : isTwitter ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <MessageCircle className="h-5 w-5" /> {fmt(comments)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Repeat2 className="h-5 w-5 text-green-600" /> {fmt(shares)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Heart className="h-5 w-5 text-red-500" /> {fmt(likes)}
                    </span>
                  </>
                ) : isLinkedin ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <ThumbsUp className="h-5 w-5 text-blue-700" /> {fmt(likes)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <MessageCircle className="h-5 w-5" /> {fmt(comments)}
                    </span>
                    {shares > 0 && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Share2 className="h-5 w-5" /> {fmt(shares)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Heart className="h-5 w-5 text-red-500" /> {fmt(likes)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <MessageCircle className="h-5 w-5" /> {fmt(comments)}
                    </span>
                    {shares > 0 && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Share2 className="h-5 w-5" /> {fmt(shares)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column -- details */}
        <div className={cn((isTextFocused || isFullWidth) ? '' : 'lg:col-span-3', 'space-y-4')}>
          {/* Status + meta */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={statusLabel === 'published' ? 'green' : statusLabel === 'scheduled' ? 'blue' : 'red'}>
                  {statusLabel}
                </Badge>
                {target?.socialAccount && (
                  <Badge variant="default" className={platformBadgeClass}>{target.socialAccount.platform}</Badge>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {new Date(publishedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-2">{post.title}</h2>
              {/* Content text - skip for Twitter since it's shown in the card above */}
              {contentText && !isTwitter && (
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{contentText}</p>
              )}
            </CardContent>
          </Card>

          {/* Metrics grid */}
          {(impressions > 0 || reach > 0 || saves > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-400" /> Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Impressions', value: impressions, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Reach', value: reach, icon: Share2, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Saves', value: saves, icon: Bookmark, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Engagement', value: likes + comments + shares, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].filter(m => m.value > 0).map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="text-center p-3 rounded-xl bg-slate-50">
                        <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg mb-1.5', m.bg)}>
                          <Icon className={cn('h-4 w-4', m.color)} />
                        </div>
                        <p className="text-lg font-bold text-slate-900">{fmt(m.value)}</p>
                        <p className="text-[11px] text-slate-500">{m.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          {(() => {
            const commentsList = (psc?.commentsList ?? []) as Array<{ id: string; message: string; from?: { name: string }; created_time: string }>;
            if (commentsList.length === 0) return null;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-slate-400" /> Comments ({commentsList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {commentsList.map((c) => (
                      <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-slate-50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                          {(c.from?.name ?? '?')[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">{c.from?.name ?? 'User'}</p>
                            <span className="text-[11px] text-slate-400">
                              {new Date(c.created_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Additional media */}
          {post.media.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">All Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {post.media.map((m) => (
                    <div key={m.id} className="rounded-lg overflow-hidden border border-slate-200">
                      {m.type === 'VIDEO' ? (
                        <video src={m.url} className="w-full aspect-square object-cover" controls />
                      ) : (
                        <img src={m.url} alt="" className="w-full aspect-square object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
