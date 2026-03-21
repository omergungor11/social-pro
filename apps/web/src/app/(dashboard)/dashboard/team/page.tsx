"use client";

import * as React from "react";
import type { Metadata } from "next";
import { UserPlus, MoreVertical, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatarUrl?: string;
  joinedAt: string; // ISO date string
}

interface PendingInvitation {
  id: string;
  email: string;
  role: MemberRole;
  invitedAt: string; // ISO date string
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Jane Doe",
    email: "jane@acmemedia.com",
    role: "OWNER",
    joinedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    name: "Marcus Webb",
    email: "marcus@acmemedia.com",
    role: "ADMIN",
    joinedAt: "2024-03-02T00:00:00Z",
  },
  {
    id: "3",
    name: "Priya Nair",
    email: "priya@acmemedia.com",
    role: "EDITOR",
    joinedAt: "2024-06-18T00:00:00Z",
  },
  {
    id: "4",
    name: "Tom Bradley",
    email: "tom@acmemedia.com",
    role: "VIEWER",
    joinedAt: "2025-01-09T00:00:00Z",
  },
];

const MOCK_INVITATIONS: PendingInvitation[] = [
  {
    id: "inv-1",
    email: "sarah.kim@freelance.io",
    role: "EDITOR",
    invitedAt: "2026-03-14T10:30:00Z",
  },
  {
    id: "inv-2",
    email: "dev@partner-agency.com",
    role: "VIEWER",
    invitedAt: "2026-03-16T15:00:00Z",
  },
];

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Viewer" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// Deterministic gradient per name
const AVATAR_GRADIENTS = [
  "from-blue-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
  "from-amber-500 to-yellow-600",
  "from-cyan-500 to-sky-600",
];

function getAvatarGradient(name: string): string {
  const index =
    name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] ?? AVATAR_GRADIENTS[0]!;
}

function roleBadgeVariant(
  role: MemberRole
): "purple" | "blue" | "green" | "gray" {
  switch (role) {
    case "OWNER":
      return "purple";
    case "ADMIN":
      return "blue";
    case "EDITOR":
      return "green";
    case "VIEWER":
      return "gray";
  }
}

function roleLabel(role: MemberRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
}

function Avatar({ name, size = "md" }: AvatarProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm",
        `bg-gradient-to-br ${getAvatarGradient(name)}`,
        size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs"
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role dropdown (inline)
// ---------------------------------------------------------------------------

interface RoleDropdownProps {
  currentRole: MemberRole;
  memberId: string;
  onRoleChange: (id: string, role: MemberRole) => void;
  disabled?: boolean;
}

function RoleDropdown({
  currentRole,
  memberId,
  onRoleChange,
  disabled = false,
}: RoleDropdownProps): React.JSX.Element {
  return (
    <select
      value={currentRole}
      disabled={disabled}
      onChange={(e) => onRoleChange(memberId, e.target.value as MemberRole)}
      className={cn(
        "h-8 rounded-md border border-input bg-background px-2 py-1 pr-6 text-xs",
        "ring-offset-background appearance-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
      aria-label={`Change role for ${memberId}`}
    >
      {ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: MemberRole) => void;
}

function InviteDialog({
  open,
  onClose,
  onInvite,
}: InviteDialogProps): React.JSX.Element {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<MemberRole>("EDITOR");
  const [emailError, setEmailError] = React.useState<string | undefined>(
    undefined
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setEmailError(undefined);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    onInvite(trimmed, role);
    setEmail("");
    setRole("EDITOR");
    onClose();
  }

  function handleClose(): void {
    setEmail("");
    setRole("EDITOR");
    setEmailError(undefined);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Invite Team Member"
      description="They will receive an email with a link to join your agency workspace."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError !== undefined) setEmailError(undefined);
            }}
            error={emailError}
            autoFocus
            autoComplete="email"
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            hint="Owners and Admins can manage all workspace settings."
          />
        </div>
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">
            <UserPlus />
            Send Invitation
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Remove confirmation dialog
// ---------------------------------------------------------------------------

interface RemoveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string;
}

function RemoveDialog({
  open,
  onClose,
  onConfirm,
  memberName,
}: RemoveDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Remove Team Member"
      description={`Are you sure you want to remove ${memberName} from the workspace? They will lose access immediately.`}
    >
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <Trash2 />
          Remove Member
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cancel invitation confirmation dialog
// ---------------------------------------------------------------------------

interface CancelInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
}

function CancelInviteDialog({
  open,
  onClose,
  onConfirm,
  email,
}: CancelInviteDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancel Invitation"
      description={`Cancel the pending invitation sent to ${email}?`}
    >
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Keep Invitation
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Cancel Invitation
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Note: metadata cannot be exported from a "use client" component.
// If you need metadata, create a separate layout or use generateMetadata in
// a server wrapper. Title is set via the DashboardShell breadcrumb instead.

export default function TeamPage(): React.JSX.Element {
  const [members, setMembers] = React.useState<TeamMember[]>(MOCK_MEMBERS);
  const [invitations, setInvitations] =
    React.useState<PendingInvitation[]>(MOCK_INVITATIONS);

  // Dialog state
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removingMember, setRemovingMember] = React.useState<TeamMember | null>(
    null
  );
  const [cancelingInvite, setCancelingInvite] =
    React.useState<PendingInvitation | null>(null);

  // Open row actions dropdown id
  const [openActionsId, setOpenActionsId] = React.useState<string | null>(null);

  function handleRoleChange(id: string, newRole: MemberRole): void {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  }

  function handleRemoveMember(id: string): void {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleCancelInvite(id: string): void {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  }

  function handleInvite(email: string, role: MemberRole): void {
    const newInvite: PendingInvitation = {
      id: `inv-${Date.now()}`,
      email,
      role,
      invitedAt: new Date().toISOString(),
    };
    setInvitations((prev) => [newInvite, ...prev]);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to your agency workspace.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus />
          Invite Member
        </Button>
      </div>

      {/* Members table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription className="mt-1">
                {members.length} member{members.length !== 1 ? "s" : ""} in
                your workspace
              </CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-slate-300" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-slate-100 bg-slate-50/60">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Member
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                    Role
                  </th>
                  <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const isOwner = member.role === "OWNER";
                  const actionsOpen = openActionsId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* Member info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {member.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {member.email}
                            </p>
                          </div>
                          {/* Role badge — visible on mobile only */}
                          <div className="sm:hidden">
                            <Badge variant={roleBadgeVariant(member.role)}>
                              {roleLabel(member.role)}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Role column — hidden on mobile */}
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <Badge variant={roleBadgeVariant(member.role)}>
                          {roleLabel(member.role)}
                        </Badge>
                      </td>

                      {/* Joined date */}
                      <td className="hidden px-6 py-4 text-slate-500 md:table-cell">
                        {formatDate(member.joinedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role change dropdown — disabled for owner */}
                          <RoleDropdown
                            currentRole={member.role}
                            memberId={member.id}
                            onRoleChange={handleRoleChange}
                            disabled={isOwner}
                          />

                          {/* More actions */}
                          <div className="relative">
                            <button
                              type="button"
                              disabled={isOwner}
                              onClick={() =>
                                setOpenActionsId(
                                  actionsOpen ? null : member.id
                                )
                              }
                              className={cn(
                                "rounded-md p-1.5 transition-colors",
                                isOwner
                                  ? "cursor-not-allowed text-slate-300"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              )}
                              aria-label={`Actions for ${member.name}`}
                              aria-haspopup="true"
                              aria-expanded={actionsOpen}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {actionsOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenActionsId(null)}
                                  aria-hidden="true"
                                />
                                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionsId(null);
                                      setRemovingMember(member);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription className="mt-1">
              {invitations.length} outstanding invitation
              {invitations.length !== 1 ? "s" : ""} awaiting acceptance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                      Role
                    </th>
                    <th className="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                      Invited
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Generic avatar placeholder */}
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50">
                            <span className="text-[10px] font-semibold text-slate-400">
                              ?
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-700">
                              {inv.email}
                            </p>
                            <p className="text-xs text-amber-600 font-medium">
                              Pending
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <Badge variant={roleBadgeVariant(inv.role)}>
                          {roleLabel(inv.role)}
                        </Badge>
                      </td>
                      <td className="hidden px-6 py-4 text-slate-500 md:table-cell">
                        {formatDate(inv.invitedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelingInvite(inv)}
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />

      <RemoveDialog
        open={removingMember !== null}
        onClose={() => setRemovingMember(null)}
        onConfirm={() => {
          if (removingMember !== null) {
            handleRemoveMember(removingMember.id);
          }
        }}
        memberName={removingMember?.name ?? ""}
      />

      <CancelInviteDialog
        open={cancelingInvite !== null}
        onClose={() => setCancelingInvite(null)}
        onConfirm={() => {
          if (cancelingInvite !== null) {
            handleCancelInvite(cancelingInvite.id);
          }
        }}
        email={cancelingInvite?.email ?? ""}
      />
    </div>
  );
}
