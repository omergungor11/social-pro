'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogFooter } from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GroupColor =
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'pink'
  | 'amber'
  | 'cyan'
  | 'red'
  | 'slate';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  avatarColor: string;
}

interface ClientGroup {
  id: string;
  name: string;
  description: string;
  color: GroupColor;
  members: GroupMember[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Color config
// ---------------------------------------------------------------------------

interface ColorConfig {
  label: string;
  swatch: string;
  card: string;
  badge: string;
  dot: string;
}

const COLOR_CONFIG: Record<GroupColor, ColorConfig> = {
  violet: {
    label: 'Violet',
    swatch: 'bg-violet-500',
    card: 'border-violet-200 bg-violet-50/40',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  blue: {
    label: 'Blue',
    swatch: 'bg-blue-500',
    card: 'border-blue-200 bg-blue-50/40',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  emerald: {
    label: 'Emerald',
    swatch: 'bg-emerald-500',
    card: 'border-emerald-200 bg-emerald-50/40',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  pink: {
    label: 'Pink',
    swatch: 'bg-pink-500',
    card: 'border-pink-200 bg-pink-50/40',
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    dot: 'bg-pink-500',
  },
  amber: {
    label: 'Amber',
    swatch: 'bg-amber-500',
    card: 'border-amber-200 bg-amber-50/40',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  cyan: {
    label: 'Cyan',
    swatch: 'bg-cyan-500',
    card: 'border-cyan-200 bg-cyan-50/40',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  red: {
    label: 'Red',
    swatch: 'bg-red-500',
    card: 'border-red-200 bg-red-50/40',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  slate: {
    label: 'Slate',
    swatch: 'bg-slate-500',
    card: 'border-slate-200 bg-slate-50/40',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
};

const COLOR_KEYS = Object.keys(COLOR_CONFIG) as GroupColor[];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GROUPS: ClientGroup[] = [
  {
    id: 'g1',
    name: 'Enterprise',
    description: 'Large enterprise clients with custom SLAs and dedicated account management.',
    color: 'violet',
    members: [
      { id: 'c1', name: 'Acme Corporation', email: 'contact@acme.com', avatarInitials: 'AC', avatarColor: 'from-violet-500 to-purple-600' },
      { id: 'c9', name: 'Ironclad Legal', email: 'pr@ironcladlegal.com', avatarInitials: 'IL', avatarColor: 'from-slate-500 to-gray-600' },
    ],
    createdAt: '2024-01-01',
  },
  {
    id: 'g2',
    name: 'Startup',
    description: 'High-growth startups with flexible content needs and fast turnaround.',
    color: 'blue',
    members: [
      { id: 'c6', name: 'Founders Launchpad', email: 'team@founderslaunchpad.co', avatarInitials: 'FL', avatarColor: 'from-amber-500 to-orange-600' },
      { id: 'c8', name: 'Harbor Analytics', email: 'growth@harboranalytics.ai', avatarInitials: 'HA', avatarColor: 'from-sky-500 to-blue-600' },
      { id: 'c12', name: 'Luminary Fintech', email: 'content@luminaryfintech.io', avatarInitials: 'LF', avatarColor: 'from-indigo-500 to-violet-600' },
    ],
    createdAt: '2024-01-01',
  },
  {
    id: 'g3',
    name: 'E-commerce',
    description: 'Online retail brands running product campaigns and seasonal promotions.',
    color: 'pink',
    members: [
      { id: 'c5', name: 'Echo Commerce', email: 'marketing@echocommerce.shop', avatarInitials: 'EC', avatarColor: 'from-pink-500 to-rose-600' },
      { id: 'c7', name: 'Greenleaf Organics', email: 'hello@greenleaforganics.com', avatarInitials: 'GO', avatarColor: 'from-lime-500 to-green-600' },
      { id: 'c10', name: 'Jasmine Beauty Co.', email: 'social@jasminebeauty.com', avatarInitials: 'JB', avatarColor: 'from-fuchsia-500 to-pink-600' },
      { id: 'c15', name: 'Olympus Fitness', email: 'marketing@olympusfitness.com', avatarInitials: 'OF', avatarColor: 'from-yellow-500 to-amber-600' },
    ],
    createdAt: '2024-01-01',
  },
  {
    id: 'g4',
    name: 'Healthcare',
    description: 'Healthcare providers and wellness brands requiring compliance oversight.',
    color: 'emerald',
    members: [
      { id: 'c4', name: 'Delta Health Partners', email: 'social@deltahealth.com', avatarInitials: 'DH', avatarColor: 'from-green-500 to-emerald-600' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 'g5',
    name: 'SaaS',
    description: 'Software-as-a-service companies with technical content and developer audiences.',
    color: 'cyan',
    members: [
      { id: 'c3', name: 'CloudSync Systems', email: 'ops@cloudsync.tech', avatarInitials: 'CS', avatarColor: 'from-blue-500 to-cyan-600' },
      { id: 'c8', name: 'Harbor Analytics', email: 'growth@harboranalytics.ai', avatarInitials: 'HA', avatarColor: 'from-sky-500 to-blue-600' },
      { id: 'c12', name: 'Luminary Fintech', email: 'content@luminaryfintech.io', avatarInitials: 'LF', avatarColor: 'from-indigo-500 to-violet-600' },
      { id: 'c14', name: 'NorthWave Software', email: 'brand@northwave.dev', avatarInitials: 'NW', avatarColor: 'from-cyan-500 to-sky-600' },
    ],
    createdAt: '2024-02-01',
  },
  {
    id: 'g6',
    name: 'Agency',
    description: 'Creative and marketing agencies managing multiple brand identities.',
    color: 'amber',
    members: [
      { id: 'c2', name: 'Bright Ideas Studio', email: 'hello@brightideas.io', avatarInitials: 'BI', avatarColor: 'from-emerald-500 to-teal-600' },
      { id: 'c13', name: 'Metro Event Group', email: 'social@metroeventgroup.com', avatarInitials: 'ME', avatarColor: 'from-orange-500 to-red-600' },
    ],
    createdAt: '2024-02-15',
  },
];

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface GroupForm {
  name: string;
  description: string;
  color: GroupColor;
}

const EMPTY_FORM: GroupForm = { name: '', description: '', color: 'blue' };

// ---------------------------------------------------------------------------
// Color Picker
// ---------------------------------------------------------------------------

function ColorPicker({
  value,
  onChange,
}: {
  value: GroupColor;
  onChange: (c: GroupColor) => void;
}): React.JSX.Element {
  return (
    <div>
      <p className="mb-2 text-sm font-medium leading-none">Color</p>
      <div className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((colorKey) => (
          <button
            key={colorKey}
            type="button"
            onClick={() => onChange(colorKey)}
            title={COLOR_CONFIG[colorKey].label}
            className={cn(
              'h-7 w-7 rounded-full transition-all duration-150',
              COLOR_CONFIG[colorKey].swatch,
              value === colorKey
                ? 'ring-2 ring-offset-2 ring-slate-700 scale-110'
                : 'hover:scale-105 opacity-70 hover:opacity-100'
            )}
            aria-label={`Select ${COLOR_CONFIG[colorKey].label} color`}
            aria-pressed={value === colorKey}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members panel (shown inside a dialog)
// ---------------------------------------------------------------------------

function MembersPanel({
  group,
  onClose,
}: {
  group: ClientGroup;
  onClose: () => void;
}): React.JSX.Element {
  const config = COLOR_CONFIG[group.color];

  return (
    <div>
      {/* Group badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold',
            config.badge
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', config.dot)} aria-hidden="true" />
          {group.name}
        </span>
        <span className="text-sm text-slate-500">
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {group.members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Users className="h-10 w-10 text-slate-200" />
          <p className="text-sm text-slate-400">No members in this group yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div
                className={cn(
                  'h-8 w-8 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shadow-sm',
                  member.avatarColor
                )}
                aria-hidden="true"
              >
                {member.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/clients/${member.id}`}
                  className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors truncate block"
                  onClick={onClose}
                >
                  {member.name}
                </Link>
                <p className="text-xs text-slate-500 truncate">{member.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group Card
// ---------------------------------------------------------------------------

interface GroupCardProps {
  group: ClientGroup;
  onView: (group: ClientGroup) => void;
  onEdit: (group: ClientGroup) => void;
  onDelete: (group: ClientGroup) => void;
}

function GroupCard({ group, onView, onEdit, onDelete }: GroupCardProps): React.JSX.Element {
  const config = COLOR_CONFIG[group.color];

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-150 hover:shadow-md cursor-pointer',
        config.card
      )}
      onClick={() => onView(group)}
      role="button"
      tabIndex={0}
      aria-label={`View ${group.name} group members`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(group);
        }
      }}
    >
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'h-3 w-3 shrink-0 rounded-full shadow-sm',
                config.dot
              )}
              aria-hidden="true"
            />
            <h3 className="font-semibold text-slate-900 truncate">{group.name}</h3>
          </div>

          {/* Actions (stop propagation so card click doesn't fire) */}
          <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(group)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
              aria-label={`Edit ${group.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(group)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-500 transition-colors"
              aria-label={`Delete ${group.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {group.description && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            {group.description}
          </p>
        )}

        {/* Footer: member count + avatars */}
        <div className="mt-4 flex items-center justify-between">
          {/* Stacked avatars */}
          {group.members.length > 0 ? (
            <div className="flex items-center">
              {group.members.slice(0, 4).map((member, i) => (
                <div
                  key={member.id}
                  className={cn(
                    'h-6 w-6 rounded-full bg-gradient-to-br text-[9px] font-bold text-white',
                    'flex items-center justify-center border-2 border-white shadow-sm',
                    member.avatarColor,
                    i > 0 && '-ml-1.5'
                  )}
                  title={member.name}
                  aria-hidden="true"
                >
                  {member.avatarInitials}
                </div>
              ))}
              {group.members.length > 4 && (
                <div className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-bold text-slate-600 shadow-sm">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-6 items-center">
              <span className="text-xs text-slate-400">No members yet</span>
            </div>
          )}

          <Badge variant="default" className="text-xs ml-2 shrink-0">
            <Users className="h-3 w-3 mr-1" />
            {group.members.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientGroupsPage(): React.JSX.Element {
  const [groups, setGroups] = React.useState<ClientGroup[]>(MOCK_GROUPS);

  // Dialogs
  type DialogState =
    | { type: 'view'; group: ClientGroup }
    | { type: 'create' }
    | { type: 'edit'; group: ClientGroup }
    | { type: 'delete'; group: ClientGroup }
    | null;

  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [form, setForm] = React.useState<GroupForm>(EMPTY_FORM);

  function openCreate(): void {
    setForm(EMPTY_FORM);
    setDialog({ type: 'create' });
  }

  function openEdit(group: ClientGroup): void {
    setForm({ name: group.name, description: group.description, color: group.color });
    setDialog({ type: 'edit', group });
  }

  function closeDialog(): void {
    setDialog(null);
    setForm(EMPTY_FORM);
  }

  // Create
  function handleCreate(): void {
    if (!form.name.trim()) return;
    const newGroup: ClientGroup = {
      id: `g${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      members: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setGroups((prev) => [...prev, newGroup]);
    closeDialog();
  }

  // Edit
  function handleEdit(): void {
    if (dialog?.type !== 'edit' || !form.name.trim()) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === dialog.group.id
          ? { ...g, name: form.name.trim(), description: form.description.trim(), color: form.color }
          : g
      )
    );
    closeDialog();
  }

  // Delete
  function handleDelete(): void {
    if (dialog?.type !== 'delete') return;
    setGroups((prev) => prev.filter((g) => g.id !== dialog.group.id));
    closeDialog();
  }

  const totalMembers = groups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/clients">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to clients">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Client Groups</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {groups.length} groups · {totalMembers} total assignments
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>

        {/* Groups grid */}
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 py-20">
            <Users className="h-12 w-12 text-slate-200" />
            <div className="text-center">
              <p className="font-medium text-slate-500">No groups yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Create your first group to organise clients.
              </p>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onView={(g) => setDialog({ type: 'view', group: g })}
                onEdit={openEdit}
                onDelete={(g) => setDialog({ type: 'delete', group: g })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* View Members Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={dialog?.type === 'view'}
        onClose={closeDialog}
        title={dialog?.type === 'view' ? `${dialog.group.name} — Members` : 'Members'}
        maxWidth="max-w-md"
      >
        {dialog?.type === 'view' && (
          <MembersPanel group={dialog.group} onClose={closeDialog} />
        )}
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Create Group Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={dialog?.type === 'create'}
        onClose={closeDialog}
        title="New Group"
        description="Create a new group to organise your clients."
      >
        <div className="space-y-4">
          <Input
            label="Group Name *"
            placeholder="e.g. Enterprise, VIP Clients"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Description</label>
            <textarea
              placeholder="Optional description of this group..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
          </div>
          <ColorPicker
            value={form.color}
            onChange={(c) => setForm((f) => ({ ...f, color: c }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Edit Group Dialog                                                     */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={dialog?.type === 'edit'}
        onClose={closeDialog}
        title="Edit Group"
        description="Update group information."
      >
        <div className="space-y-4">
          <Input
            label="Group Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
          </div>
          <ColorPicker
            value={form.color}
            onChange={(c) => setForm((f) => ({ ...f, color: c }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!form.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                            */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={dialog?.type === 'delete'}
        onClose={closeDialog}
        title="Delete Group"
        description={
          dialog?.type === 'delete'
            ? `Are you sure you want to delete "${dialog.group.name}"? This will not delete the clients in this group.`
            : 'Are you sure?'
        }
      >
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Group
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
