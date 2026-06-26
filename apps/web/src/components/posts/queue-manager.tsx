'use client';

import * as React from 'react';
import { CalendarClock, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostingSlot {
  id: string;
  socialAccountId: string | null;
  dayOfWeek: number;
  hour: number;
  minute: number;
  isActive: boolean;
}

interface AccountOption {
  id: string;
  label: string;
}

interface QueueManagerProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_OPTIONS = DAY_NAMES.map((label, value) => ({ value: String(value), label }));

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: String(h).padStart(2, '0'),
}));

const MINUTE_OPTIONS = [0, 15, 30, 45].map((m) => ({
  value: String(m),
  label: String(m).padStart(2, '0'),
}));

function fmtTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QueueManager({ open, onClose }: QueueManagerProps): React.JSX.Element {
  const [slots, setSlots] = React.useState<PostingSlot[]>([]);
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // New-slot form.
  const [day, setDay] = React.useState('1');
  const [hour, setHour] = React.useState('9');
  const [minute, setMinute] = React.useState('0');
  const [accountId, setAccountId] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<PostingSlot[]>('/posting-slots');
      setSlots(data ?? []);
    } catch (err) {
      console.error('Failed to load posting slots:', err);
      setError('Failed to load queue slots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void load();
    apiClient
      .get<Array<{ id: string; platform: string; displayName: string | null; platformUsername: string | null }>>(
        '/social-accounts',
      )
      .then((list) =>
        setAccounts(
          list.map((a) => ({
            id: a.id,
            label: `${a.displayName ?? a.platformUsername ?? 'Account'} (${(a.platform ?? '').toLowerCase()})`,
          })),
        ),
      )
      .catch(() => {
        /* optional scoping — non-fatal */
      });
  }, [open, load]);

  async function handleAdd(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.post<PostingSlot>('/posting-slots', {
        dayOfWeek: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        socialAccountId: accountId || undefined,
      });
      setSlots((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to add slot:', err);
      setError('Failed to add slot. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    try {
      await apiClient.delete(`/posting-slots/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete slot:', err);
      setError('Failed to delete slot. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  const accountLabel = React.useCallback(
    (id: string | null): string | null => {
      if (!id) return null;
      return accounts.find((a) => a.id === id)?.label ?? 'Specific account';
    },
    [accounts],
  );

  // Group slots by day for a tidy weekly view.
  const grouped = React.useMemo(() => {
    const map = new Map<number, PostingSlot[]>();
    for (const s of slots) {
      const arr = map.get(s.dayOfWeek) ?? [];
      arr.push(s);
      map.set(s.dayOfWeek, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    }
    return map;
  }, [slots]);

  const accountSelectOptions = React.useMemo(
    () => [{ value: '', label: 'Any account' }, ...accounts.map((a) => ({ value: a.id, label: a.label }))],
    [accounts],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Posting queue"
      description="Define recurring weekly time slots. Bulk-scheduling drops drafts onto the next free slots."
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Add-slot form */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-medium text-slate-600">Add a slot</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[120px] flex-1">
              <label className="mb-1 block text-[11px] text-slate-500">Day</label>
              <Select value={day} onChange={(e) => setDay(e.target.value)} options={DAY_OPTIONS} />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-[11px] text-slate-500">Hour</label>
              <Select value={hour} onChange={(e) => setHour(e.target.value)} options={HOUR_OPTIONS} />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-[11px] text-slate-500">Min</label>
              <Select value={minute} onChange={(e) => setMinute(e.target.value)} options={MINUTE_OPTIONS} />
            </div>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-slate-500">Account (optional)</label>
              <Select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accountSelectOptions}
              />
            </div>
            <Button size="sm" className="gap-1.5" disabled={saving} onClick={() => void handleAdd()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </Button>
          </div>
        </div>

        {/* Slot list */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600">Weekly slots</p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <CalendarClock className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-500">No slots yet.</p>
              <p className="text-xs text-slate-400">Add a few times above to start queueing posts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DAY_NAMES.map((dayName, dow) => {
                const daySlots = grouped.get(dow);
                if (!daySlots || daySlots.length === 0) return null;
                return (
                  <div key={dow}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {dayName}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {daySlots.map((slot) => {
                        const acct = accountLabel(slot.socialAccountId);
                        return (
                          <span
                            key={slot.id}
                            className={cn(
                              'group flex items-center gap-1.5 rounded-md border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-sm',
                            )}
                          >
                            <span className="font-medium text-slate-700">
                              {fmtTime(slot.hour, slot.minute)}
                            </span>
                            {acct && <span className="text-xs text-slate-400">· {acct}</span>}
                            <button
                              type="button"
                              onClick={() => void handleDelete(slot.id)}
                              disabled={deletingId === slot.id}
                              className="rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                              aria-label="Delete slot"
                            >
                              {deletingId === slot.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
