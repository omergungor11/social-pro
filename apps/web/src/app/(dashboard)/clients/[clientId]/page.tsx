'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  Mail,
  Phone,
  Building2,
  StickyNote,
  Users,
  Share2,
  Check,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
  color: string;
}

interface SocialAccount {
  id: string;
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin';
  handle: string;
  connected: boolean;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  tags: ClientTag[];
  groups: ClientGroup[];
  socialAccounts: SocialAccount[];
  avatarInitials: string;
  avatarColor: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ALL_GROUPS: ClientGroup[] = [
  { id: 'g1', name: 'Enterprise', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'g2', name: 'Startup', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'g3', name: 'E-commerce', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'g4', name: 'Healthcare', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'g5', name: 'SaaS', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'g6', name: 'Agency', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

const MOCK_CLIENTS_MAP: Record<string, ClientDetail> = {
  c1: {
    id: 'c1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1 (555) 100-0001',
    company: 'Acme Corp',
    notes:
      'Long-standing enterprise client. Quarterly review scheduled for Q2. Primary contact is Sarah Johnson from marketing. Prefers content reviewed before publishing.',
    tags: [
      { label: 'Enterprise', variant: 'purple' },
      { label: 'VIP', variant: 'blue' },
    ],
    groups: [MOCK_ALL_GROUPS[0]!],
    socialAccounts: [
      { id: 'sa1', platform: 'instagram', handle: '@acmecorp', connected: true },
      { id: 'sa2', platform: 'twitter', handle: '@AcmeCorp', connected: true },
      { id: 'sa3', platform: 'linkedin', handle: 'acme-corporation', connected: false },
    ],
    avatarInitials: 'AC',
    avatarColor: 'from-violet-500 to-purple-600',
    createdAt: '2024-01-15',
  },
  c2: {
    id: 'c2',
    name: 'Bright Ideas Studio',
    email: 'hello@brightideas.io',
    phone: '+1 (555) 200-0002',
    company: 'Bright Ideas Studio',
    notes: 'Creative agency, monthly retainer. Focus on Instagram and Pinterest.',
    tags: [{ label: 'Agency', variant: 'green' }],
    groups: [MOCK_ALL_GROUPS[5]!],
    socialAccounts: [
      { id: 'sa4', platform: 'instagram', handle: '@brightideasstudio', connected: true },
      { id: 'sa5', platform: 'facebook', handle: 'BrightIdeasStudio', connected: true },
    ],
    avatarInitials: 'BI',
    avatarColor: 'from-emerald-500 to-teal-600',
    createdAt: '2024-02-03',
  },
};

// Fallback for unknown IDs
function buildFallbackClient(id: string): ClientDetail {
  return {
    id,
    name: 'Unknown Client',
    email: 'unknown@example.com',
    phone: '',
    company: '',
    notes: '',
    tags: [],
    groups: [],
    socialAccounts: [],
    avatarInitials: 'UC',
    avatarColor: 'from-slate-400 to-slate-600',
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Platform icon helper
// ---------------------------------------------------------------------------

function PlatformIcon({
  platform,
  className,
}: {
  platform: SocialAccount['platform'];
  className?: string;
}): React.JSX.Element {
  const icons: Record<SocialAccount['platform'], React.ElementType> = {
    instagram: Instagram,
    twitter: Twitter,
    facebook: Facebook,
    linkedin: Linkedin,
  };
  const Icon = icons[platform];
  return <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />;
}

const PLATFORM_COLORS: Record<SocialAccount['platform'], string> = {
  instagram: 'text-pink-600 bg-pink-50 border-pink-200',
  twitter: 'text-sky-600 bg-sky-50 border-sky-200',
  facebook: 'text-blue-600 bg-blue-50 border-blue-200',
  linkedin: 'text-blue-700 bg-blue-50 border-blue-200',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientDetailPage(): React.JSX.Element {
  const params = useParams();
  const clientId = typeof params['clientId'] === 'string' ? params['clientId'] : '';

  // ── State ─────────────────────────────────────────────────────────────────
  const [client, setClient] = React.useState<ClientDetail>(() => {
    return MOCK_CLIENTS_MAP[clientId] ?? buildFallbackClient(clientId);
  });

  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notesBuffer, setNotesBuffer] = React.useState(client.notes);

  // Dialogs
  const [addTagOpen, setAddTagOpen] = React.useState(false);
  const [newTag, setNewTag] = React.useState('');
  const [assignGroupOpen, setAssignGroupOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  // Edit form
  const [editForm, setEditForm] = React.useState({
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
  });

  // ── Notes handlers ────────────────────────────────────────────────────────
  function handleSaveNotes(): void {
    setClient((c) => ({ ...c, notes: notesBuffer }));
    setIsEditingNotes(false);
  }

  function handleCancelNotes(): void {
    setNotesBuffer(client.notes);
    setIsEditingNotes(false);
  }

  // ── Tag handlers ──────────────────────────────────────────────────────────
  function handleAddTag(): void {
    const label = newTag.trim();
    if (!label) return;
    if (client.tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setNewTag('');
      setAddTagOpen(false);
      return;
    }
    setClient((c) => ({
      ...c,
      tags: [...c.tags, { label, variant: 'default' }],
    }));
    setNewTag('');
    setAddTagOpen(false);
  }

  function handleRemoveTag(label: string): void {
    setClient((c) => ({
      ...c,
      tags: c.tags.filter((t) => t.label !== label),
    }));
  }

  // ── Group handlers ────────────────────────────────────────────────────────
  const unassignedGroups = MOCK_ALL_GROUPS.filter(
    (g) => !client.groups.some((cg) => cg.id === g.id)
  );

  function handleAssignGroup(group: ClientGroup): void {
    setClient((c) => ({ ...c, groups: [...c.groups, group] }));
  }

  function handleUnassignGroup(groupId: string): void {
    setClient((c) => ({
      ...c,
      groups: c.groups.filter((g) => g.id !== groupId),
    }));
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────
  function handleSaveEdit(): void {
    setClient((c) => ({ ...c, ...editForm }));
    setEditOpen(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 pb-10">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/clients">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to clients">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <p className="text-sm text-slate-500">
                Client since {new Date(client.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column ───────────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-1">
            {/* Profile card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'h-20 w-20 rounded-full bg-gradient-to-br flex items-center justify-center',
                      'text-2xl font-bold text-white shadow-md',
                      client.avatarColor
                    )}
                    aria-hidden="true"
                  >
                    {client.avatarInitials}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {client.name}
                    </h2>
                    {client.company && (
                      <p className="text-sm text-slate-500">{client.company}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                        Email
                      </p>
                      <a
                        href={`mailto:${client.email}`}
                        className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate block"
                      >
                        {client.email}
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  {client.phone && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                          Phone
                        </p>
                        <a
                          href={`tel:${client.phone}`}
                          className="text-sm text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          {client.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Company */}
                  {client.company && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                          Company
                        </p>
                        <p className="text-sm text-slate-700">{client.company}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Groups card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    Groups
                  </CardTitle>
                  {unassignedGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAssignGroupOpen(true)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      aria-label="Assign to group"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {client.groups.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-slate-400">No groups assigned</p>
                    {unassignedGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAssignGroupOpen(true)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Assign to a group
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {client.groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            group.color
                          )}
                        >
                          {group.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnassignGroup(group.id)}
                          className="rounded p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label={`Remove from ${group.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right column ──────────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Tags card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tags</CardTitle>
                  <button
                    type="button"
                    onClick={() => setAddTagOpen(true)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add tag
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {client.tags.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <p className="text-sm text-slate-400">No tags yet</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                      >
                        {tag.label}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.label)}
                          className="ml-0.5 rounded-full p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Remove tag ${tag.label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-slate-400" />
                    Notes
                  </CardTitle>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotesBuffer(client.notes);
                        setIsEditingNotes(true);
                      }}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={notesBuffer}
                      onChange={(e) => setNotesBuffer(e.target.value)}
                      rows={5}
                      autoFocus
                      placeholder="Add notes about this client..."
                      className={cn(
                        'flex w-full rounded-md border border-input bg-background px-3 py-2',
                        'text-sm placeholder:text-muted-foreground resize-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      )}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes} className="gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelNotes}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'min-h-[80px] rounded-lg p-3 text-sm',
                      client.notes
                        ? 'bg-amber-50/60 border border-amber-100 text-slate-700 whitespace-pre-wrap'
                        : 'flex items-center justify-center text-slate-400 border border-dashed border-slate-200'
                    )}
                  >
                    {client.notes || (
                      <button
                        type="button"
                        onClick={() => {
                          setNotesBuffer('');
                          setIsEditingNotes(true);
                        }}
                        className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Click to add notes...
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected social accounts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-slate-400" />
                    Connected Social Accounts
                  </CardTitle>
                  <span className="text-xs text-slate-400">Read only</span>
                </div>
              </CardHeader>
              <CardContent>
                {client.socialAccounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Share2 className="h-8 w-8 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      No social accounts connected
                    </p>
                    <p className="text-xs text-slate-300">
                      Social accounts are managed from the Social Accounts section.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {client.socialAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                            PLATFORM_COLORS[account.platform]
                          )}
                        >
                          <PlatformIcon platform={account.platform} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 capitalize">
                            {account.platform}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {account.handle}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border',
                            account.connected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              account.connected
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            )}
                          />
                          {account.connected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Add Tag Dialog                                                        */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={addTagOpen}
        onClose={() => {
          setAddTagOpen(false);
          setNewTag('');
        }}
        title="Add Tag"
        description="Add a tag to categorise this client."
      >
        <div className="space-y-4">
          <Input
            label="Tag name"
            placeholder="e.g. VIP, Enterprise, Renewal"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddTagOpen(false);
                setNewTag('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTag} disabled={!newTag.trim()}>
              Add Tag
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Assign Group Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={assignGroupOpen}
        onClose={() => setAssignGroupOpen(false)}
        title="Assign to Group"
        description="Select a group to assign this client to."
      >
        <div className="space-y-2 py-1">
          {unassignedGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Client is already in all groups.
            </p>
          ) : (
            unassignedGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  handleAssignGroup(group);
                  setAssignGroupOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    group.color
                  )}
                >
                  {group.name}
                </span>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAssignGroupOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Edit Client Dialog                                                    */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Client"
        description="Update client information."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <Input
              label="Phone"
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <Input
              label="Company"
              value={editForm.company}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editForm.name.trim() || !editForm.email.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                            */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Client"
        description={`Are you sure you want to permanently delete "${client.name}"? This action cannot be undone.`}
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(false)}>
            Delete Client
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
