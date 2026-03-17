'use client';

import * as React from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Sparkles,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type Platform } from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  platform: Platform | 'all';
  prompt: string;
  variables: string[];
  isSystem: boolean;
  category: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const SYSTEM_TEMPLATES: Template[] = [
  {
    id: 'sys-1',
    name: 'Product Launch Announcement',
    platform: 'all',
    prompt: 'Write an exciting product launch announcement for {product_name} that highlights {key_feature} and targets {target_audience}. Include a clear call to action.',
    variables: ['product_name', 'key_feature', 'target_audience'],
    isSystem: true,
    category: 'Product',
  },
  {
    id: 'sys-2',
    name: 'Weekly Engagement Recap',
    platform: 'linkedin',
    prompt: 'Create a professional weekly recap post highlighting our team\'s accomplishments in {department}. Mention {achievement} and invite connections to {call_to_action}.',
    variables: ['department', 'achievement', 'call_to_action'],
    isSystem: true,
    category: 'Engagement',
  },
  {
    id: 'sys-3',
    name: 'Trending Topic Hook',
    platform: 'twitter',
    prompt: 'Write a concise, engaging tweet about {trending_topic} from the perspective of a {industry} professional. Keep it under 280 characters and include relevant hashtags.',
    variables: ['trending_topic', 'industry'],
    isSystem: true,
    category: 'Trending',
  },
  {
    id: 'sys-4',
    name: 'Customer Testimonial Spotlight',
    platform: 'instagram',
    prompt: 'Transform this customer quote into a compelling Instagram caption: "{customer_quote}". Add relevant context about {company_service} and include 5 strategic hashtags.',
    variables: ['customer_quote', 'company_service'],
    isSystem: true,
    category: 'Social Proof',
  },
  {
    id: 'sys-5',
    name: 'Behind the Scenes Story',
    platform: 'facebook',
    prompt: 'Write an authentic behind-the-scenes Facebook post about {team_activity} that showcases {company_value}. Make it personal, warm, and invite community engagement.',
    variables: ['team_activity', 'company_value'],
    isSystem: true,
    category: 'Culture',
  },
];

const INITIAL_CUSTOM_TEMPLATES: Template[] = [
  {
    id: 'cus-1',
    name: 'Agency Monthly Report Teaser',
    platform: 'linkedin',
    prompt: 'Write a LinkedIn post teasing our monthly results for {client_name}. Highlight {top_metric} growth without revealing confidential data. Build credibility and invite DMs.',
    variables: ['client_name', 'top_metric'],
    isSystem: false,
    category: 'Agency',
  },
  {
    id: 'cus-2',
    name: 'TikTok Challenge Pitch',
    platform: 'tiktok',
    prompt: 'Write a fun TikTok video script (30 sec) for {brand_name} challenging users to {challenge_action}. Include a hook in the first 3 seconds and a clear CTA.',
    variables: ['brand_name', 'challenge_action'],
    isSystem: false,
    category: 'Video',
  },
  {
    id: 'cus-3',
    name: 'Seasonal Promotion',
    platform: 'all',
    prompt: 'Create a {season} promotional post for {product_service} offering {discount_details}. Include urgency, a clear deadline of {end_date}, and a compelling CTA.',
    variables: ['season', 'product_service', 'discount_details', 'end_date'],
    isSystem: false,
    category: 'Promotion',
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const PLATFORM_LABEL: Record<string, string> = {
  all: 'All Platforms',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

// ---------------------------------------------------------------------------
// Helper: extract {variables} from prompt text
// ---------------------------------------------------------------------------

function extractVariables(prompt: string): string[] {
  const matches = prompt.matchAll(/\{(\w+)\}/g);
  const vars = Array.from(matches, (m) => m[1] as string);
  return [...new Set(vars)];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TemplateFormState {
  name: string;
  platform: string;
  prompt: string;
}

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: TemplateFormState;
  onSave: (data: TemplateFormState) => void;
  mode: 'create' | 'edit';
}

function TemplateDialog({
  open,
  onClose,
  initial,
  onSave,
  mode,
}: TemplateDialogProps): React.JSX.Element {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [platform, setPlatform] = React.useState(initial?.platform ?? 'all');
  const [prompt, setPrompt] = React.useState(initial?.prompt ?? '');

  // Reset when dialog opens with new initial data
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setPlatform(initial?.platform ?? 'all');
      setPrompt(initial?.prompt ?? '');
    }
  }, [open, initial]);

  const detectedVars = extractVariables(prompt);
  const isValid = name.trim().length > 0 && prompt.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!isValid) return;
    onSave({ name: name.trim(), platform, prompt: prompt.trim() });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Template' : 'Edit Template'}
      description="Build a reusable prompt template for your team."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Product Launch Announcement"
          required
        />

        <Select
          label="Platform"
          value={platform}
          options={PLATFORM_OPTIONS}
          onChange={(e) => setPlatform(e.target.value)}
        />

        {/* Prompt textarea */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            Prompt Template
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write your prompt here. Use {variable_name} for dynamic fields."
            rows={5}
            required
            className={cn(
              'w-full resize-none rounded-md border border-input bg-background px-3 py-2',
              'text-sm ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          />
          <p className="text-xs text-slate-500">
            Wrap dynamic fields in curly braces: <code className="bg-slate-100 px-1 rounded">{'{variable_name}'}</code>
          </p>
        </div>

        {/* Variables helper */}
        {detectedVars.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-700">
              Detected Variables ({detectedVars.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detectedVars.map((v) => (
                <span
                  key={v}
                  className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {'{' + v + '}'}
                </span>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid}>
            {mode === 'create' ? 'Create Template' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
  onConfirm: () => void;
}

function DeleteDialog({
  open,
  onClose,
  templateName,
  onConfirm,
}: DeleteDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Template"
      description="This action cannot be undone."
    >
      <p className="text-sm text-slate-600">
        Are you sure you want to delete{' '}
        <span className="font-semibold text-slate-800">{templateName}</span>?
      </p>
      <DialogFooter className="mt-5">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
  onDelete?: (id: string) => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps): React.JSX.Element {
  return (
    <Card className={cn(
      'group transition-all duration-150',
      template.isSystem
        ? 'border-slate-200 bg-slate-50/50'
        : 'hover:border-blue-200 hover:shadow-md hover:shadow-blue-50'
    )}>
      <CardContent className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-800">
                {template.name}
              </h3>
              {template.isSystem && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  <Lock className="h-2.5 w-2.5" />
                  System
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px]">
                {PLATFORM_LABEL[template.platform] ?? template.platform}
              </Badge>
              <Badge variant="purple" className="text-[10px]">
                {template.category}
              </Badge>
            </div>
          </div>

          {/* Actions for custom templates */}
          {!template.isSystem && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(template)}
                aria-label={`Edit ${template.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete?.(template.id)}
                aria-label={`Delete ${template.name}`}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Prompt preview */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
          {template.prompt}
        </p>

        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.variables.map((v) => (
              <span
                key={v}
                className="rounded-full bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"
              >
                {'{' + v + '}'}
              </span>
            ))}
          </div>
        )}

        {/* Use button */}
        <Button variant="outline" size="sm" className="w-full">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AiTemplatesPage(): React.JSX.Element {
  const [customTemplates, setCustomTemplates] = React.useState<Template[]>(INITIAL_CUSTOM_TEMPLATES);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Template | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const deleteTarget = customTemplates.find((t) => t.id === deleteTargetId) ?? null;

  function handleCreate(data: TemplateFormState): void {
    const newTemplate: Template = {
      id: `cus-${Date.now()}`,
      name: data.name,
      platform: data.platform as Platform | 'all',
      prompt: data.prompt,
      variables: extractVariables(data.prompt),
      isSystem: false,
      category: 'Custom',
    };
    setCustomTemplates((prev) => [newTemplate, ...prev]);
    setCreateOpen(false);
  }

  function handleEdit(data: TemplateFormState): void {
    if (!editTarget) return;
    setCustomTemplates((prev) =>
      prev.map((t) =>
        t.id === editTarget.id
          ? {
              ...t,
              name: data.name,
              platform: data.platform as Platform | 'all',
              prompt: data.prompt,
              variables: extractVariables(data.prompt),
            }
          : t
      )
    );
    setEditTarget(null);
  }

  function handleDelete(id: string): void {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleteTargetId(null);
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Prompt Templates
          </h1>
          <p className="text-sm text-slate-500">
            Reusable prompt templates to speed up your AI content creation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* System templates section */}
      <section aria-labelledby="system-templates-heading">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2
            id="system-templates-heading"
            className="text-sm font-semibold text-slate-700"
          >
            System Templates
          </h2>
          <Badge variant="gray">{SYSTEM_TEMPLATES.length}</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SYSTEM_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      </section>

      {/* Custom templates section */}
      <section aria-labelledby="custom-templates-heading">
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate className="h-4 w-4 text-blue-500" aria-hidden="true" />
          <h2
            id="custom-templates-heading"
            className="text-sm font-semibold text-slate-700"
          >
            My Templates
          </h2>
          <Badge variant="blue">{customTemplates.length}</Badge>
        </div>

        {customTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 mb-3">
              <LayoutTemplate className="h-6 w-6 text-blue-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-600">No custom templates yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Create your first template to speed up content generation.
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onEdit={setEditTarget}
                onDelete={(id) => setDeleteTargetId(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create dialog */}
      <TemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      <TemplateDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        mode="edit"
        initial={
          editTarget !== null
            ? { name: editTarget.name, platform: editTarget.platform, prompt: editTarget.prompt }
            : undefined
        }
        onSave={handleEdit}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        templateName={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (deleteTargetId !== null) handleDelete(deleteTargetId);
        }}
      />
    </div>
  );
}
