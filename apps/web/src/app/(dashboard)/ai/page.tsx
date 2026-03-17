'use client';

import * as React from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type Platform } from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedVariant {
  id: string;
  content: string;
}

interface HistoryItem {
  id: string;
  prompt: string;
  model: string;
  platform: Platform;
  createdAt: string;
}

interface AiTemplate {
  id: string;
  name: string;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: AiTemplate[] = [
  { id: 't1', name: 'Product Launch', prompt: 'Write an exciting product launch announcement for {product} highlighting {feature}.' },
  { id: 't2', name: 'Weekly Recap', prompt: 'Create a weekly recap post summarising achievements in {area}.' },
  { id: 't3', name: 'Engagement Question', prompt: 'Write an engaging question post about {topic} to spark discussion.' },
  { id: 't4', name: 'Behind the Scenes', prompt: 'Share a behind-the-scenes look at {process} in our team.' },
  { id: 't5', name: 'Testimonial Highlight', prompt: 'Turn this customer quote into a compelling social post: "{quote}".' },
];

const MOCK_HISTORY: HistoryItem[] = [
  { id: 'h1', prompt: 'Write a compelling product launch post for our new SaaS analytics tool targeting SMBs...', model: 'GPT-4o', platform: 'linkedin', createdAt: '2026-03-18 14:32' },
  { id: 'h2', prompt: 'Create 3 Twitter threads about social media trends in 2026 for marketing agencies...', model: 'GPT-4o', platform: 'twitter', createdAt: '2026-03-18 11:15' },
  { id: 'h3', prompt: 'Instagram caption for a minimalist workspace photo with engagement hooks...', model: 'GPT-4o mini', platform: 'instagram', createdAt: '2026-03-17 16:47' },
  { id: 'h4', prompt: 'Facebook post announcing a 20% spring discount for our consulting services...', model: 'GPT-4o', platform: 'facebook', createdAt: '2026-03-17 09:20' },
  { id: 'h5', prompt: 'TikTok script idea for a 30-second video showcasing our team culture and values...', model: 'GPT-4o mini', platform: 'tiktok', createdAt: '2026-03-16 13:55' },
];

const MOCK_RESULTS: GeneratedVariant[] = [
  {
    id: 'v1',
    content: "Introducing Social Pro Analytics — the command center your agency has been waiting for. Real-time dashboards, AI-powered insights, and white-label reports that make your clients say \"wow\" every single time. Ready to transform how you deliver results? Link in bio. #AgencyLife #SocialMedia #Analytics",
  },
  {
    id: 'v2',
    content: "We built Social Pro Analytics because spreadsheets were killing creativity. Now you get instant cross-platform insights, automated reports, and AI recommendations — all in one place. Your clients deserve better. So do you. Start your free trial today and see the difference. #MarketingAgency #SocialMediaTools",
  },
  {
    id: 'v3',
    content: "What if your analytics could tell you exactly what to post, when to post it, and why it would work? That's Social Pro Analytics. Trusted by 500+ agencies to drive measurable growth for their clients. The future of social media management is here — are you in? Drop a comment below! #SocialPro #DigitalMarketing",
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'formal', label: 'Formal' },
  { value: 'inspirational', label: 'Inspirational' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
];

// Usage meter bar
function UsageBar({ used, total }: { used: number; total: number }): React.JSX.Element {
  const pct = Math.min(Math.round((used / total) * 100), 100);
  const colorClass = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-blue-500';

  return (
    <div className="flex items-center gap-3">
      <Zap className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600">
            {used.toLocaleString()} / {total.toLocaleString()} AI credits used this month
          </span>
          <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Copy button with "copied" feedback
function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);

  function handleCopy(): void {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// Template dropdown
function TemplateDropdown({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        Use Template
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-150', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden py-1"
          >
            {MOCK_TEMPLATES.map((tpl) => (
              <li key={tpl.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tpl.prompt);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-800">{tpl.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{tpl.prompt}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// History sidebar item
function HistoryItem({ item }: { item: HistoryItem }): React.JSX.Element {
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-slate-100 bg-white p-3 text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-150 space-y-1.5"
    >
      <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed">
        {item.prompt}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="blue" className="text-[10px] px-1.5 py-0">
          {item.platform}
        </Badge>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="h-2.5 w-2.5" />
          {item.createdAt}
        </div>
      </div>
      <p className="text-[10px] text-slate-400">{item.model}</p>
    </button>
  );
}

// Generated variant card
function VariantCard({
  variant,
  index,
}: {
  variant: GeneratedVariant;
  index: number;
}): React.JSX.Element {
  return (
    <Card className="group hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all duration-150">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Variant {index + 1}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {variant.content}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1 sm:flex-none">
            Use This
          </Button>
          <CopyButton text={variant.content} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MAX_PROMPT_CHARS = 1000;

export default function AiContentPage(): React.JSX.Element {
  const [prompt, setPrompt] = React.useState('');
  const [platform, setPlatform] = React.useState('linkedin');
  const [tone, setTone] = React.useState('professional');
  const [language, setLanguage] = React.useState('en');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<GeneratedVariant[]>([]);
  const [hasGenerated, setHasGenerated] = React.useState(false);

  function handleGenerate(): void {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    // Simulate async generation
    setTimeout(() => {
      setResults(MOCK_RESULTS);
      setHasGenerated(true);
      setLoading(false);
    }, 1800);
  }

  function handleTemplateSelect(templatePrompt: string): void {
    setPrompt(templatePrompt);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Content Generator
          </h1>
          <p className="text-sm text-slate-500">
            Generate engaging social media content with AI assistance.
          </p>
        </div>
      </div>

      {/* Usage meter */}
      <Card>
        <CardContent className="py-4">
          <UsageBar used={3840} total={5000} />
        </CardContent>
      </Card>

      {/* Main split layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — generator */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" aria-hidden="true" />
                Content Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Prompt textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ai-prompt"
                    className="text-sm font-medium text-slate-700"
                  >
                    Prompt
                  </label>
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      prompt.length > MAX_PROMPT_CHARS * 0.9
                        ? 'text-red-500'
                        : 'text-slate-400'
                    )}
                  >
                    {prompt.length} / {MAX_PROMPT_CHARS}
                  </span>
                </div>
                <textarea
                  id="ai-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
                  placeholder="Describe the content you want to create. E.g. &quot;Write a product launch announcement for our new analytics tool targeting marketing agencies...&quot;"
                  rows={5}
                  className={cn(
                    'w-full resize-none rounded-md border border-input bg-background px-3 py-2',
                    'text-sm ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
              </div>

              {/* Options row */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  label="Platform"
                  value={platform}
                  options={PLATFORM_OPTIONS}
                  onChange={(e) => setPlatform(e.target.value)}
                />
                <Select
                  label="Tone"
                  value={tone}
                  options={TONE_OPTIONS}
                  onChange={(e) => setTone(e.target.value)}
                />
                <Select
                  label="Language"
                  value={language}
                  options={LANGUAGE_OPTIONS}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>

              {/* Template quick-select + Generate button */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <TemplateDropdown onSelect={handleTemplateSelect} />
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || loading}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-slate-500">Generating your content variants...</p>
              </div>
            </div>
          )}

          {!loading && hasGenerated && results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">
                Generated Variants
              </h2>
              {results.map((variant, i) => (
                <VariantCard key={variant.id} variant={variant} index={i} />
              ))}
            </div>
          )}

          {!loading && !hasGenerated && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 mb-3">
                <Sparkles className="h-6 w-6 text-violet-400" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Your generated content will appear here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Enter a prompt above and click Generate
              </p>
            </div>
          )}
        </div>

        {/* Right — history sidebar */}
        <aside className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Recent Generations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOCK_HISTORY.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
