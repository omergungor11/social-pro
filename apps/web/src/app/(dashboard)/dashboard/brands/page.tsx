'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  SlidersHorizontal,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { BulkToolbar } from '@/components/clients/bulk-toolbar';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientTag {
  label: string;
  variant: 'default' | 'purple' | 'blue' | 'green' | 'gray' | 'red';
}

interface ClientGroup {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: ClientTag[];
  groups: ClientGroup[];
  avatarInitials: string;
  avatarColor: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

interface ApiClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  tags: string[];
  groups: { id: string; name: string }[];
  createdAt: string;
}

interface ApiGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-pink-600',
];

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function mapApiClient(a: ApiClient): Client {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone ?? '',
    company: a.company ?? '',
    notes: a.notes ?? '',
    tags: (a.tags ?? []).map((label) => ({ label, variant: 'default' as const })),
    groups: (a.groups ?? []).map((g) => ({ id: g.id, name: g.name })),
    avatarInitials: getInitials(a.name),
    avatarColor: getAvatarColor(a.id),
    createdAt: a.createdAt.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Client form fields type
// ---------------------------------------------------------------------------

interface CreateClientForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: string;
}

const EMPTY_FORM: CreateClientForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
  tags: '',
};

// ---------------------------------------------------------------------------
// Avatar helper
// ---------------------------------------------------------------------------

function ClientAvatar({
  initials,
  colorClass,
  size = 'md',
}: {
  initials: string;
  colorClass: string;
  size?: 'sm' | 'md';
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'shrink-0 rounded-full bg-gradient-to-br font-semibold text-white flex items-center justify-center shadow-sm',
        colorClass,
        size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row actions menu
// ---------------------------------------------------------------------------

function RowActions({
  clientId,
  onDelete,
}: {
  clientId: string;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Row actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10">
          <Link
            href={`/dashboard/brands/${clientId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5 text-slate-400" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => {
              onDelete(clientId);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ClientsPage(): React.JSX.Element {
  // ── Data state ────────────────────────────────────────────────────────────
  const [clients, setClients] = React.useState<Client[]>([]);
  const [groups, setGroups] = React.useState<ClientGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState('');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateClientForm>(EMPTY_FORM);

  // ── Fetch clients ─────────────────────────────────────────────────────────
  const fetchClients = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<ApiClient[]>('/clients');
      setClients(data.map(mapApiClient));
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch groups for filter dropdown ─────────────────────────────────────
  const fetchGroups = React.useCallback(async () => {
    try {
      const data = await apiClient.get<ApiGroup[]>('/clients/groups');
      setGroups(data.map((g) => ({ id: g.id, name: g.name })));
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  React.useEffect(() => {
    void fetchClients();
    void fetchGroups();
  }, [fetchClients, fetchGroups]);

  // ── Derived: filtered list ────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const tagQ = tagFilter.toLowerCase().trim();
    return clients.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q);

      const matchGroup =
        !groupFilter || c.groups.some((g) => g.id === groupFilter);

      const matchTag =
        !tagQ || c.tags.some((t) => t.label.toLowerCase().includes(tagQ));

      return matchSearch && matchGroup && matchTag;
    });
  }, [clients, search, groupFilter, tagFilter]);

  // ── Derived: current page slice ───────────────────────────────────────────
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [search, groupFilter, tagFilter, pageSize]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const pageIds = paginated.map((c) => c.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSelectAll(): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectRow(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  async function handleCreateClient(): Promise<void> {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await apiClient.post<ApiClient>('/clients', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setClients((prev) => [mapApiClient(created), ...prev]);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setToast({ message: 'Brand created successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to create client:', err);
      setToast({ message: 'Failed to create client. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClient(id: string): Promise<void> {
    setDeleting(true);
    try {
      await apiClient.delete(`/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteTargetId(null);
      setToast({ message: 'Brand deleted', type: 'success' });
    } catch (err) {
      console.error('Failed to delete client:', err);
      setToast({ message: 'Failed to delete client. Please try again.', type: 'error' });
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Bulk action handlers ──────────────────────────────────────────────────
  async function handleBulkDelete(): Promise<void> {
    try {
      const ids = Array.from(selectedIds);
      await apiClient.post('/clients/bulk', { operation: 'delete', clientIds: ids });
      setClients((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setToast({ message: `${ids.length} brand${ids.length > 1 ? 's' : ''} deleted`, type: 'success' });
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      setToast({ message: 'Bulk delete failed. Please try again.', type: 'error' });
    }
  }

  async function handleBulkAddToGroup(groupId: string): Promise<void> {
    try {
      const ids = Array.from(selectedIds);
      await apiClient.post(`/clients/groups/${groupId}/members`, { clientIds: ids });
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setClients((prev) =>
          prev.map((c) => {
            if (!selectedIds.has(c.id)) return c;
            if (c.groups.some((g) => g.id === groupId)) return c;
            return { ...c, groups: [...c.groups, group] };
          })
        );
      }
      setToast({ message: 'Brands added to group', type: 'success' });
    } catch (err) {
      console.error('Failed to add to group:', err);
      setToast({ message: 'Failed to add to group. Please try again.', type: 'error' });
    }
  }

  async function handleBulkRemoveFromGroup(groupId: string): Promise<void> {
    try {
      const ids = Array.from(selectedIds);
      await apiClient.delete(`/clients/groups/${groupId}/members`, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: ids }) as unknown as BodyInit,
      } as RequestInit);
      setClients((prev) =>
        prev.map((c) => {
          if (!selectedIds.has(c.id)) return c;
          return { ...c, groups: c.groups.filter((g) => g.id !== groupId) };
        })
      );
      setToast({ message: 'Brands removed from group', type: 'success' });
    } catch (err) {
      console.error('Failed to remove from group:', err);
      setToast({ message: 'Failed to remove from group. Please try again.', type: 'error' });
    }
  }

  function handleBulkAddTags(tags: string[]): void {
    // Optimistic local update — backend bulk tag update via POST /clients/bulk
    void (async () => {
      try {
        const ids = Array.from(selectedIds);
        await apiClient.post('/clients/bulk', { operation: 'add_tags', clientIds: ids, tags });
        setClients((prev) =>
          prev.map((c) => {
            if (!selectedIds.has(c.id)) return c;
            const existingLabels = new Set(c.tags.map((t) => t.label.toLowerCase()));
            const newTags: ClientTag[] = tags
              .filter((t) => !existingLabels.has(t.toLowerCase()))
              .map((label) => ({ label, variant: 'default' as const }));
            return { ...c, tags: [...c.tags, ...newTags] };
          })
        );
        setToast({ message: 'Tags added', type: 'success' });
      } catch (err) {
        console.error('Failed to add tags:', err);
        setToast({ message: 'Failed to add tags. Please try again.', type: 'error' });
      }
    })();
  }

  // ── Group filter options ──────────────────────────────────────────────────
  const groupFilterOptions = React.useMemo(() => [
    { value: '', label: 'All Groups' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ], [groups]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Brands</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading ? 'Loading brands...' : `${clients.length} total brand${clients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/brands/groups">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="h-4 w-4" />
                Groups
              </Button>
            </Link>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Brand
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              type="button"
              onClick={() => void fetchClients()}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Group filter */}
          <div className="w-44">
            <Select
              placeholder="All Groups"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              options={groupFilterOptions}
              aria-label="Filter by group"
            />
          </div>

          {/* Tag filter */}
          <div className="relative w-44">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
            {tagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear tag filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active filter count indicator */}
          {(search || groupFilter || tagFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setGroupFilter('');
                setTagFilter('');
              }}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      indeterminate={!allOnPageSelected && someOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="hidden xl:table-cell">Groups</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-16 text-center text-slate-400"
                    >
                      {search || groupFilter || tagFilter
                        ? 'No brands match your filters.'
                        : 'No brands yet. Create your first brand to get started.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((client) => (
                    <TableRow
                      key={client.id}
                      selected={selectedIds.has(client.id)}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(client.id)}
                          onChange={() => toggleSelectRow(client.id)}
                          aria-label={`Select ${client.name}`}
                        />
                      </TableCell>

                      {/* Name + avatar */}
                      <TableCell>
                        <Link
                          href={`/dashboard/brands/${client.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <ClientAvatar
                            initials={client.avatarInitials}
                            colorClass={client.avatarColor}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {client.name}
                            </p>
                            <p className="text-xs text-slate-500 sm:hidden truncate">
                              {client.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="hidden sm:table-cell text-slate-500">
                        {client.email}
                      </TableCell>

                      {/* Company */}
                      <TableCell className="hidden md:table-cell text-slate-600">
                        {client.company || (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      {/* Tags */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {client.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag.label}
                              variant={tag.variant}
                              className="text-[11px]"
                            >
                              {tag.label}
                            </Badge>
                          ))}
                          {client.tags.length > 3 && (
                            <Badge variant="gray" className="text-[11px]">
                              +{client.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Groups */}
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {client.groups.length === 0 ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : (
                            client.groups.slice(0, 2).map((g) => (
                              <Badge
                                key={g.id}
                                variant="blue"
                                className="text-[11px]"
                              >
                                {g.name}
                              </Badge>
                            ))
                          )}
                          {client.groups.length > 2 && (
                            <Badge variant="gray" className="text-[11px]">
                              +{client.groups.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <RowActions
                          clientId={client.id}
                          onDelete={(id) => setDeleteTargetId(id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Create Client Dialog                                                 */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setForm(EMPTY_FORM);
        }}
        title="New Brand"
        description="Add a new brand to your roster."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name *"
              placeholder="Acme Corporation"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="contact@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Company"
              placeholder="Company name"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>

          <Input
            label="Tags"
            placeholder="vip, enterprise, renewal"
            hint="Separate tags with commas."
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Notes</label>
            <textarea
              placeholder="Any notes about this brand..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setForm(EMPTY_FORM);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateClient()}
              disabled={!form.name.trim() || !form.email.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Brand'
              )}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                           */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Brand"
        description="This will permanently remove the brand and all associated data. This action cannot be undone."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={() => {
              if (deleteTargetId) void handleDeleteClient(deleteTargetId);
            }}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Brand'
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Bulk Toolbar                                                         */}
      {/* ------------------------------------------------------------------- */}
      <BulkToolbar
        selectedCount={selectedIds.size}
        groups={groups}
        onDelete={() => void handleBulkDelete()}
        onAddToGroup={(groupId) => void handleBulkAddToGroup(groupId)}
        onRemoveFromGroup={(groupId) => void handleBulkRemoveFromGroup(groupId)}
        onAddTags={handleBulkAddTags}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </>
  );
}
