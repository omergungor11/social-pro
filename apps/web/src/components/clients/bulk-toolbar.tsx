'use client';

import * as React from 'react';
import { Trash2, FolderPlus, FolderMinus, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientGroup {
  id: string;
  name: string;
}

export interface BulkToolbarProps {
  /** Number of currently selected rows. */
  selectedCount: number;
  /** Available groups for "Add to Group" / "Remove from Group" actions. */
  groups: ClientGroup[];
  onDelete: () => void;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: (groupId: string) => void;
  onAddTags: (tags: string[]) => void;
  onClearSelection: () => void;
}

// ---------------------------------------------------------------------------
// Dialog state union
// ---------------------------------------------------------------------------

type ActiveDialog =
  | { type: 'delete' }
  | { type: 'add-group' }
  | { type: 'remove-group' }
  | { type: 'add-tags' }
  | null;

// ---------------------------------------------------------------------------
// BulkToolbar
// ---------------------------------------------------------------------------

/**
 * Floating toolbar that slides up from the bottom of the viewport when one or
 * more table rows are selected. Provides Delete, Add to Group, Remove from
 * Group, and Add Tags bulk actions.
 */
export function BulkToolbar({
  selectedCount,
  groups,
  onDelete,
  onAddToGroup,
  onRemoveFromGroup,
  onAddTags,
  onClearSelection,
}: BulkToolbarProps): React.JSX.Element | null {
  const visible = selectedCount > 0;

  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('');
  const [tagsInput, setTagsInput] = React.useState<string>('');

  function closeDialog(): void {
    setActiveDialog(null);
    setSelectedGroupId('');
    setTagsInput('');
  }

  function handleDelete(): void {
    onDelete();
    closeDialog();
  }

  function handleAddToGroup(): void {
    if (selectedGroupId) {
      onAddToGroup(selectedGroupId);
      closeDialog();
    }
  }

  function handleRemoveFromGroup(): void {
    if (selectedGroupId) {
      onRemoveFromGroup(selectedGroupId);
      closeDialog();
    }
  }

  function handleAddTags(): void {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      onAddTags(tags);
      closeDialog();
    }
  }

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  return (
    <>
      {/* Floating bar */}
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className={cn(
          'fixed bottom-6 left-1/2 z-40 -translate-x-1/2',
          'flex items-center gap-2 rounded-xl border border-slate-200',
          'bg-white px-4 py-3 shadow-2xl shadow-slate-900/20',
          'transition-all duration-300 ease-out',
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-10 opacity-0 pointer-events-none'
        )}
      >
        {/* Selection count */}
        <span className="shrink-0 text-sm font-semibold text-slate-700 mr-1">
          {selectedCount} {selectedCount === 1 ? 'client' : 'clients'} selected
        </span>

        <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

        {/* Action buttons */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={() => setActiveDialog({ type: 'delete' })}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
          onClick={() => setActiveDialog({ type: 'add-group' })}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add to Group</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
          onClick={() => setActiveDialog({ type: 'remove-group' })}
        >
          <FolderMinus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Remove from Group</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
          onClick={() => setActiveDialog({ type: 'add-tags' })}
        >
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Tags</span>
        </Button>

        <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Delete confirmation dialog                                         */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={activeDialog?.type === 'delete'}
        onClose={closeDialog}
        title="Delete Clients"
        description={`You are about to permanently delete ${selectedCount} ${
          selectedCount === 1 ? 'client' : 'clients'
        }. This action cannot be undone.`}
      >
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete {selectedCount} {selectedCount === 1 ? 'Client' : 'Clients'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Add to group dialog                                                */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={activeDialog?.type === 'add-group'}
        onClose={closeDialog}
        title="Add to Group"
        description={`Select a group to add the ${selectedCount} selected ${
          selectedCount === 1 ? 'client' : 'clients'
        } to.`}
      >
        <div className="space-y-4">
          <Select
            label="Group"
            placeholder="Select a group..."
            options={groupOptions}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddToGroup} disabled={!selectedGroupId}>
              Add to Group
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Remove from group dialog                                           */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={activeDialog?.type === 'remove-group'}
        onClose={closeDialog}
        title="Remove from Group"
        description={`Select a group to remove the ${selectedCount} selected ${
          selectedCount === 1 ? 'client' : 'clients'
        } from.`}
      >
        <div className="space-y-4">
          <Select
            label="Group"
            placeholder="Select a group..."
            options={groupOptions}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFromGroup}
              disabled={!selectedGroupId}
            >
              Remove from Group
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Add tags dialog                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={activeDialog?.type === 'add-tags'}
        onClose={closeDialog}
        title="Add Tags"
        description={`Add tags to ${selectedCount} selected ${
          selectedCount === 1 ? 'client' : 'clients'
        }.`}
      >
        <div className="space-y-4">
          <Input
            label="Tags"
            placeholder="e.g. vip, enterprise, renewal"
            hint="Separate multiple tags with commas."
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTags();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddTags} disabled={!tagsInput.trim()}>
              Add Tags
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
