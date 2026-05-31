/**
 * Builds a human-readable URL slug for a social account.
 *
 * Instead of exposing the raw cuid (e.g. `cmppx08po0008m553zhv1doaa`), the
 * account is addressed as `{platform}-{username}` — e.g. `facebook-alp-sigorta`
 * or `instagram-mybrand`. This keeps URLs readable and groups accounts by
 * platform at a glance.
 */
export interface SlugAccount {
  id: string;
  platform?: string | null;
  platformUsername?: string | null;
  displayName?: string | null;
}

function slugifyName(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'account'
  );
}

export function buildAccountSlug(a: SlugAccount): string {
  const platform = (a.platform || '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'account';
  const name = slugifyName(a.platformUsername || a.displayName || 'account');
  return `${platform}-${name}`;
}

/**
 * Resolves the real account from a slug given a list of accounts.
 *
 * Matching order (most to least specific):
 *  1. Exact raw id — keeps old `/[cuid]` links working.
 *  2. Exact `{platform}-{username}` slug.
 *  3. Trailing short-code match (`id.endsWith(...)`) — keeps old
 *     `{username}-{6charcode}` links working.
 *
 * When multiple accounts share the same platform+username (rare), the first
 * match wins.
 */
export function resolveAccountId<T extends SlugAccount>(
  slug: string,
  accounts: T[],
): T | undefined {
  const exact = accounts.find((a) => a.id === slug);
  if (exact) return exact;

  const bySlug = accounts.find((a) => buildAccountSlug(a) === slug);
  if (bySlug) return bySlug;

  // Backward compatibility: old `{username}-{6charcode}` links.
  const idx = slug.lastIndexOf('-');
  const code = idx >= 0 ? slug.slice(idx + 1) : slug;
  return accounts.find((a) => a.id.endsWith(code));
}
