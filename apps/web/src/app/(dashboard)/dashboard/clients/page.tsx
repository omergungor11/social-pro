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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GROUPS: ClientGroup[] = [
  { id: 'g1', name: 'Enterprise' },
  { id: 'g2', name: 'Startup' },
  { id: 'g3', name: 'E-commerce' },
  { id: 'g4', name: 'Healthcare' },
  { id: 'g5', name: 'SaaS' },
  { id: 'g6', name: 'Agency' },
];

const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1 (555) 100-0001',
    company: 'Acme Corp',
    notes: 'Long-standing enterprise client. Quarterly review scheduled.',
    tags: [
      { label: 'Enterprise', variant: 'purple' },
      { label: 'VIP', variant: 'blue' },
    ],
    groups: [MOCK_GROUPS[0]!],
    avatarInitials: 'AC',
    avatarColor: 'from-violet-500 to-purple-600',
    createdAt: '2024-01-15',
  },
  {
    id: 'c2',
    name: 'Bright Ideas Studio',
    email: 'hello@brightideas.io',
    phone: '+1 (555) 200-0002',
    company: 'Bright Ideas Studio',
    notes: 'Creative agency, monthly retainer.',
    tags: [{ label: 'Agency', variant: 'green' }],
    groups: [MOCK_GROUPS[5]!],
    avatarInitials: 'BI',
    avatarColor: 'from-emerald-500 to-teal-600',
    createdAt: '2024-02-03',
  },
  {
    id: 'c3',
    name: 'CloudSync Systems',
    email: 'ops@cloudsync.tech',
    phone: '+1 (555) 300-0003',
    company: 'CloudSync Systems',
    notes: 'SaaS client, multi-platform social strategy.',
    tags: [
      { label: 'SaaS', variant: 'blue' },
      { label: 'Tech', variant: 'default' },
    ],
    groups: [MOCK_GROUPS[4]!],
    avatarInitials: 'CS',
    avatarColor: 'from-blue-500 to-cyan-600',
    createdAt: '2024-02-18',
  },
  {
    id: 'c4',
    name: 'Delta Health Partners',
    email: 'social@deltahealth.com',
    phone: '+1 (555) 400-0004',
    company: 'Delta Health Partners',
    notes: 'Healthcare compliance requirements apply.',
    tags: [
      { label: 'Healthcare', variant: 'green' },
      { label: 'Regulated', variant: 'red' },
    ],
    groups: [MOCK_GROUPS[3]!],
    avatarInitials: 'DH',
    avatarColor: 'from-green-500 to-emerald-600',
    createdAt: '2024-03-05',
  },
  {
    id: 'c5',
    name: 'Echo Commerce',
    email: 'marketing@echocommerce.shop',
    phone: '+1 (555) 500-0005',
    company: 'Echo Commerce',
    notes: 'High-volume e-commerce, seasonal campaigns.',
    tags: [
      { label: 'E-commerce', variant: 'purple' },
      { label: 'Seasonal', variant: 'default' },
    ],
    groups: [MOCK_GROUPS[2]!],
    avatarInitials: 'EC',
    avatarColor: 'from-pink-500 to-rose-600',
    createdAt: '2024-03-20',
  },
  {
    id: 'c6',
    name: 'Founders Launchpad',
    email: 'team@founderslaunchpad.co',
    phone: '+1 (555) 600-0006',
    company: 'Founders Launchpad',
    notes: 'Startup accelerator, multiple portfolio brands.',
    tags: [
      { label: 'Startup', variant: 'blue' },
      { label: 'High Growth', variant: 'green' },
    ],
    groups: [MOCK_GROUPS[1]!],
    avatarInitials: 'FL',
    avatarColor: 'from-amber-500 to-orange-600',
    createdAt: '2024-04-11',
  },
  {
    id: 'c7',
    name: 'Greenleaf Organics',
    email: 'hello@greenleaforganics.com',
    phone: '+1 (555) 700-0007',
    company: 'Greenleaf Organics',
    notes: 'D2C organic food brand, influencer focus.',
    tags: [
      { label: 'E-commerce', variant: 'purple' },
      { label: 'D2C', variant: 'default' },
    ],
    groups: [MOCK_GROUPS[2]!],
    avatarInitials: 'GO',
    avatarColor: 'from-lime-500 to-green-600',
    createdAt: '2024-04-22',
  },
  {
    id: 'c8',
    name: 'Harbor Analytics',
    email: 'growth@harboranalytics.ai',
    phone: '+1 (555) 800-0008',
    company: 'Harbor Analytics',
    notes: 'AI analytics platform, growth-phase startup.',
    tags: [
      { label: 'SaaS', variant: 'blue' },
      { label: 'AI', variant: 'purple' },
    ],
    groups: [MOCK_GROUPS[4]!, MOCK_GROUPS[1]!],
    avatarInitials: 'HA',
    avatarColor: 'from-sky-500 to-blue-600',
    createdAt: '2024-05-08',
  },
  {
    id: 'c9',
    name: 'Ironclad Legal',
    email: 'pr@ironcladlegal.com',
    phone: '+1 (555) 900-0009',
    company: 'Ironclad Legal',
    notes: 'Law firm, limited content scope, approval required.',
    tags: [
      { label: 'Enterprise', variant: 'purple' },
      { label: 'Approval Flow', variant: 'red' },
    ],
    groups: [MOCK_GROUPS[0]!],
    avatarInitials: 'IL',
    avatarColor: 'from-slate-500 to-gray-600',
    createdAt: '2024-05-30',
  },
  {
    id: 'c10',
    name: 'Jasmine Beauty Co.',
    email: 'social@jasminebeauty.com',
    phone: '+1 (555) 100-0010',
    company: 'Jasmine Beauty Co.',
    notes: 'Beauty brand, UGC and influencer campaigns.',
    tags: [
      { label: 'E-commerce', variant: 'purple' },
      { label: 'Influencer', variant: 'blue' },
    ],
    groups: [MOCK_GROUPS[2]!],
    avatarInitials: 'JB',
    avatarColor: 'from-fuchsia-500 to-pink-600',
    createdAt: '2024-06-14',
  },
  {
    id: 'c11',
    name: 'Keystone Realty',
    email: 'marketing@keystonerealty.com',
    phone: '+1 (555) 110-0011',
    company: 'Keystone Realty',
    notes: 'Regional real-estate group, listing promotions.',
    tags: [{ label: 'Real Estate', variant: 'green' }],
    groups: [],
    avatarInitials: 'KR',
    avatarColor: 'from-teal-500 to-cyan-600',
    createdAt: '2024-07-01',
  },
  {
    id: 'c12',
    name: 'Luminary Fintech',
    email: 'content@luminaryfintech.io',
    phone: '+1 (555) 120-0012',
    company: 'Luminary Fintech',
    notes: 'Fintech startup, compliance-sensitive content.',
    tags: [
      { label: 'Startup', variant: 'blue' },
      { label: 'Fintech', variant: 'default' },
      { label: 'Regulated', variant: 'red' },
    ],
    groups: [MOCK_GROUPS[1]!, MOCK_GROUPS[4]!],
    avatarInitials: 'LF',
    avatarColor: 'from-indigo-500 to-violet-600',
    createdAt: '2024-07-19',
  },
  {
    id: 'c13',
    name: 'Metro Event Group',
    email: 'social@metroeventgroup.com',
    phone: '+1 (555) 130-0013',
    company: 'Metro Event Group',
    notes: 'Event management, heavy seasonal scheduling.',
    tags: [
      { label: 'Events', variant: 'green' },
      { label: 'Seasonal', variant: 'default' },
    ],
    groups: [MOCK_GROUPS[5]!],
    avatarInitials: 'ME',
    avatarColor: 'from-orange-500 to-red-600',
    createdAt: '2024-08-05',
  },
  {
    id: 'c14',
    name: 'NorthWave Software',
    email: 'brand@northwave.dev',
    phone: '+1 (555) 140-0014',
    company: 'NorthWave Software',
    notes: 'Developer tools company, technical content.',
    tags: [
      { label: 'SaaS', variant: 'blue' },
      { label: 'Developer', variant: 'default' },
    ],
    groups: [MOCK_GROUPS[4]!],
    avatarInitials: 'NW',
    avatarColor: 'from-cyan-500 to-sky-600',
    createdAt: '2024-08-28',
  },
  {
    id: 'c15',
    name: 'Olympus Fitness',
    email: 'marketing@olympusfitness.com',
    phone: '+1 (555) 150-0015',
    company: 'Olympus Fitness',
    notes: 'Gym chain, local campaigns per location.',
    tags: [
      { label: 'Fitness', variant: 'green' },
      { label: 'Multi-location', variant: 'purple' },
    ],
    groups: [MOCK_GROUPS[2]!],
    avatarInitials: 'OF',
    avatarColor: 'from-yellow-500 to-amber-600',
    createdAt: '2024-09-10',
  },
];

const ALL_GROUPS_OPTION = { value: '', label: 'All Groups' };
const GROUP_FILTER_OPTIONS = [
  ALL_GROUPS_OPTION,
  ...MOCK_GROUPS.map((g) => ({ value: g.id, label: g.name })),
];

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

  // Close on outside click
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
            href={`/clients/${clientId}`}
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
  const [clients, setClients] = React.useState<Client[]>(MOCK_CLIENTS);

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
  function handleCreateClient(): void {
    if (!form.name.trim() || !form.email.trim()) return;

    const tags: ClientTag[] = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((label) => ({ label, variant: 'default' as const }));

    const initials = form.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');

    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-pink-500 to-rose-600',
      'from-amber-500 to-orange-600',
    ];
    const avatarColor = colors[clients.length % colors.length] ?? colors[0]!;

    const newClient: Client = {
      id: `c${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      notes: form.notes.trim(),
      tags,
      groups: [],
      avatarInitials: initials,
      avatarColor,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setClients((prev) => [newClient, ...prev]);
    setCreateOpen(false);
    setForm(EMPTY_FORM);
  }

  function handleDeleteClient(id: string): void {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeleteTargetId(null);
  }

  // ── Bulk action handlers ──────────────────────────────────────────────────
  function handleBulkDelete(): void {
    setClients((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  }

  function handleBulkAddToGroup(groupId: string): void {
    const group = MOCK_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setClients((prev) =>
      prev.map((c) => {
        if (!selectedIds.has(c.id)) return c;
        if (c.groups.some((g) => g.id === groupId)) return c;
        return { ...c, groups: [...c.groups, group] };
      })
    );
  }

  function handleBulkRemoveFromGroup(groupId: string): void {
    setClients((prev) =>
      prev.map((c) => {
        if (!selectedIds.has(c.id)) return c;
        return { ...c, groups: c.groups.filter((g) => g.id !== groupId) };
      })
    );
  }

  function handleBulkAddTags(tags: string[]): void {
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
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {clients.length} total clients
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/clients/groups">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="h-4 w-4" />
                Groups
              </Button>
            </Link>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Client
            </Button>
          </div>
        </div>

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
              options={GROUP_FILTER_OPTIONS}
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
                <TableHead>Client</TableHead>
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
                      ? 'No clients match your filters.'
                      : 'No clients yet. Create your first client to get started.'}
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
                        href={`/clients/${client.id}`}
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

          {/* Pagination */}
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
        title="New Client"
        description="Add a new client to your roster."
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
              placeholder="Any notes about this client..."
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
              onClick={handleCreateClient}
              disabled={!form.name.trim() || !form.email.trim()}
            >
              Create Client
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
        title="Delete Client"
        description="This will permanently remove the client and all associated data. This action cannot be undone."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteTargetId) handleDeleteClient(deleteTargetId);
            }}
          >
            Delete Client
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Bulk Toolbar                                                         */}
      {/* ------------------------------------------------------------------- */}
      <BulkToolbar
        selectedCount={selectedIds.size}
        groups={MOCK_GROUPS}
        onDelete={handleBulkDelete}
        onAddToGroup={handleBulkAddToGroup}
        onRemoveFromGroup={handleBulkRemoveFromGroup}
        onAddTags={handleBulkAddTags}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </>
  );
}
