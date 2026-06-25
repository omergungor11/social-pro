'use client';

import * as React from 'react';
import { MapPin, MessageSquarePlus, AtSign, X, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostExtrasValue {
  /** Tagged place — `id` is the Facebook Page/place id, usable for FB & IG. */
  location: { id: string; name: string } | null;
  /** Comment posted automatically right after the post is published. */
  firstComment: string;
  /** Usernames to tag (Instagram only). */
  userTags: string[];
}

interface LocationResult {
  id: string;
  name: string;
  address?: string;
}

interface PostExtrasProps {
  value: PostExtrasValue;
  onChange: (value: PostExtrasValue) => void;
  /**
   * A connected Facebook/Instagram account id used to resolve the location
   * search (the Graph API needs a Page token). When null, location search is
   * disabled with a hint.
   */
  searchAccountId: string | null;
  /** Whether to show the Instagram-only user-tags field. */
  showUserTags: boolean;
}

export const EMPTY_POST_EXTRAS: PostExtrasValue = {
  location: null,
  firstComment: '',
  userTags: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostExtras({
  value,
  onChange,
  searchAccountId,
  showUserTags,
}: PostExtrasProps): React.JSX.Element {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<LocationResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');

  // Debounced location search.
  React.useEffect(() => {
    const q = query.trim();
    if (!q || !searchAccountId) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await apiClient.get<LocationResult[]>(
          `/social-accounts/${searchAccountId}/location-search?q=${encodeURIComponent(q)}`,
        );
        setResults(data ?? []);
        setOpen(true);
      } catch (err) {
        console.error('Location search failed:', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [query, searchAccountId]);

  function selectLocation(loc: LocationResult): void {
    onChange({ ...value, location: { id: loc.id, name: loc.name } });
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function clearLocation(): void {
    onChange({ ...value, location: null });
  }

  function addTag(raw: string): void {
    const tag = raw.trim().replace(/^@/, '');
    if (!tag) return;
    if (value.userTags.includes(tag)) {
      setTagInput('');
      return;
    }
    onChange({ ...value, userTags: [...value.userTags, tag] });
    setTagInput('');
  }

  function removeTag(tag: string): void {
    onChange({ ...value, userTags: value.userTags.filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && value.userTags.length > 0) {
      removeTag(value.userTags[value.userTags.length - 1]!);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Extras</CardTitle>
        <p className="mt-0.5 text-xs text-slate-500">
          Optional — applied where the platform supports it (Facebook & Instagram).
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Location ────────────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <MapPin className="h-3.5 w-3.5" />
            Location
          </label>

          {value.location ? (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="flex-1 truncate text-sm text-slate-800">
                {value.location.name}
              </span>
              <button
                type="button"
                onClick={clearLocation}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Remove location"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setOpen(true)}
                  disabled={!searchAccountId}
                  placeholder={
                    searchAccountId
                      ? 'Search for a place…'
                      : 'Select a Facebook/Instagram account first'
                  }
                  className={cn(
                    'flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>

              {open && results.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {results.map((loc) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        onClick={() => selectLocation(loc)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-slate-800">{loc.name}</span>
                          {loc.address && (
                            <span className="block truncate text-xs text-slate-400">
                              {loc.address}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── First comment ──────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            First comment
          </label>
          <textarea
            value={value.firstComment}
            onChange={(e) => onChange({ ...value, firstComment: e.target.value })}
            placeholder="Posted as the first comment right after publishing (e.g. hashtags)…"
            rows={3}
            className={cn(
              'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground resize-y focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          />
        </div>

        {/* ── User tags (Instagram only) ─────────────────────────────── */}
        {showUserTags && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <AtSign className="h-3.5 w-3.5" />
              Tag users
              <span className="font-normal text-slate-400">(Instagram)</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
              {value.userTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                >
                  @{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={value.userTags.length === 0 ? 'username, then Enter…' : ''}
                className="min-w-[100px] flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Tagged users are centered on the first image.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
