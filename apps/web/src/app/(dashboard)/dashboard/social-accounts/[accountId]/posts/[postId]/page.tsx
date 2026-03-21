'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, MessageCircle, Eye, Share2, Bookmark,
  TrendingUp, Calendar, Clock, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Mock post data
// ---------------------------------------------------------------------------

function getPostData(postId: string) {
  const num = parseInt(postId.replace('post-', ''), 10) || 1;
  const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#a855f7', '#0ea5e9', '#84cc16'];
  const captions = [
    'New product launch! Excited to share what we\'ve been working on 🚀\n\nAfter months of development, we\'re proud to introduce our latest innovation. This is going to change the way you think about productivity.\n\n#Launch #Innovation #ProductDev',
    'Behind the scenes at our latest photoshoot 📸\n\nOur creative team worked tirelessly to capture the essence of our brand. Every detail matters.\n\n#BTS #Creative #Photography',
    'Meet the team that makes it all happen 💪\n\nFrom engineering to design, our diverse team brings unique perspectives to every challenge.\n\n#Team #Culture #Hiring',
    'Customer spotlight: How @client achieved 3x growth\n\nRead the full case study on our blog. Real results, real stories.\n\n#CaseStudy #Growth #Success',
  ];

  const caption = captions[(num - 1) % captions.length];
  const color = colors[(num - 1) % colors.length];

  return {
    id: postId,
    thumbnail: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${color}"/><text x="300" y="300" text-anchor="middle" dy=".35em" fill="white" font-size="72" font-family="sans-serif">${num}</text></svg>`)}`,
    caption,
    publishedAt: new Date(2026, 2, 20 - num + 1).toISOString(),
    status: num <= 10 ? 'published' : num === 11 ? 'scheduled' : 'failed',
    type: num % 5 === 0 ? 'Video' : num % 7 === 0 ? 'Carousel' : 'Image',
    metrics: {
      likes: Math.floor(Math.random() * 2000) + 500 + num * 100,
      comments: Math.floor(Math.random() * 300) + 30 + num * 10,
      shares: Math.floor(Math.random() * 200) + 20,
      saves: Math.floor(Math.random() * 500) + 50,
      impressions: Math.floor(Math.random() * 50000) + 10000 + num * 2000,
      reach: Math.floor(Math.random() * 30000) + 8000 + num * 1500,
      engagementRate: parseFloat((Math.random() * 8 + 2).toFixed(1)),
      profileVisits: Math.floor(Math.random() * 500) + 100,
    },
    hourlyEngagement: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      value: Math.floor(Math.random() * 200) + (i > 8 && i < 22 ? 100 : 20),
    })),
    topComments: [
      { user: 'sarah.design', text: 'This is amazing! Love the direction 🔥', likes: 45, time: '2h ago' },
      { user: 'mike_tech', text: 'Can\'t wait to try this out! When is the launch?', likes: 32, time: '3h ago' },
      { user: 'creative.agency', text: 'Brilliant work as always 👏', likes: 28, time: '5h ago' },
      { user: 'john.smith', text: 'This is exactly what we needed. Great job team!', likes: 19, time: '6h ago' },
      { user: 'marketing_pro', text: 'The engagement on this post is insane 📈', likes: 15, time: '8h ago' },
    ],
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Mini engagement chart
// ---------------------------------------------------------------------------

function EngagementChart({ data }: { data: { hour: string; value: number }[] }): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-blue-500/70 hover:bg-blue-600 transition-colors cursor-default"
          style={{ height: `${(d.value / max) * 100}%`, minHeight: 2 }}
          title={`${d.hour}: ${d.value} interactions`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PostDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const postId = params.postId as string;

  const post = getPostData(postId);

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
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Post image — left column */}
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm sticky top-24">
            <img src={post.thumbnail} alt="" className="w-full aspect-square object-cover" />
            <div className="p-4 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-500 transition-colors">
                  <Heart className="h-5 w-5" /> {fmt(post.metrics.likes)}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-5 w-5" /> {fmt(post.metrics.comments)}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-500 transition-colors">
                  <Share2 className="h-5 w-5" /> {fmt(post.metrics.shares)}
                </button>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right column — details */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status + meta */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={post.status === 'published' ? 'green' : post.status === 'scheduled' ? 'blue' : 'red'}>
                  {post.status}
                </Badge>
                <Badge variant="default">{post.type}</Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{post.caption}</p>
            </CardContent>
          </Card>

          {/* Metrics grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-400" /> Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Impressions', value: post.metrics.impressions, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Reach', value: post.metrics.reach, icon: Share2, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Saves', value: post.metrics.saves, icon: Bookmark, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Profile Visits', value: post.metrics.profileVisits, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((m) => {
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

              <div className="mt-4 p-3 rounded-xl bg-emerald-50 flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  {post.metrics.engagementRate}% Engagement Rate
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Hourly engagement chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Engagement by Hour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EngagementChart data={post.hourlyEngagement} />
              <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </CardContent>
          </Card>

          {/* Top comments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-slate-400" /> Top Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {post.topComments.map((comment, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {comment.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">@{comment.user}</span>
                        <span className="text-[10px] text-slate-400">{comment.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{comment.text}</p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                        <Heart className="h-3 w-3" /> {comment.likes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
