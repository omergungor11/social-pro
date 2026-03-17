# Phase 2: Client Management

## TASK-018: Prisma Schema — Client Entities

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-008

### Acceptance Criteria
- [ ] `Client` model: id, agency_id, name, email, phone, company, avatar_url, notes, tags (String[]), metadata (Json), timestamps
- [ ] `ClientGroup` model: id, agency_id, name, color, description, timestamps
- [ ] `ClientGroupMembership` model: id, client_id, group_id, timestamps. Unique(client_id, group_id)
- [ ] Relations: Agency 1:N Client, Agency 1:N ClientGroup, Client N:M ClientGroup
- [ ] Indexes: (agency_id, name), (agency_id, email)
- [ ] Migration applied

---

## TASK-019: Client Module — CRUD

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-018, TASK-011

### Acceptance Criteria
- [ ] `GET /api/v1/clients` — list with search (name, email, company), filter (tags, group), pagination, sort
- [ ] `POST /api/v1/clients` — create client
- [ ] `GET /api/v1/clients/:id` — get client detail (with groups, social accounts)
- [ ] `PATCH /api/v1/clients/:id` — update client
- [ ] `DELETE /api/v1/clients/:id` — soft delete
- [ ] All endpoints tenant-scoped
- [ ] DTOs with validation

---

## TASK-020: ClientGroup Module

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-018, TASK-011

### Acceptance Criteria
- [ ] `GET /api/v1/clients/groups` — list groups with member count
- [ ] `POST /api/v1/clients/groups` — create group
- [ ] `PATCH /api/v1/clients/groups/:id` — update group
- [ ] `DELETE /api/v1/clients/groups/:id` — delete group (members unassigned)
- [ ] `POST /api/v1/clients/groups/:id/members` — add clients to group (array of client IDs)
- [ ] `DELETE /api/v1/clients/groups/:id/members` — remove clients from group

---

## TASK-021: Bulk Operations Service

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-019

### Acceptance Criteria
- [ ] `POST /api/v1/clients/bulk` — bulk operations endpoint
- [ ] Actions: `add` (create multiple), `edit` (update multiple), `delete` (delete multiple), `add-to-group`, `remove-from-group`, `add-tags`, `remove-tags`
- [ ] Request body: `{ action, client_ids?, data? }`
- [ ] Transaction-based: all or nothing
- [ ] Response: `{ success_count, failed_count, errors[] }`
- [ ] Max 500 clients per operation

---

## TASK-022: Client List Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-015, TASK-019

### Acceptance Criteria
- [ ] Data table: name, email, company, tags, groups, actions
- [ ] Search bar (name, email, company)
- [ ] Filter: by group, by tags
- [ ] Pagination (10/20/50 per page)
- [ ] Sort by name, created date
- [ ] "New Client" button → create dialog
- [ ] Row click → client detail page
- [ ] Checkbox selection for bulk actions

---

## TASK-023: Client Detail Page

**Agent**: frontend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-022

### Acceptance Criteria
- [ ] Client info card: name, email, phone, company, avatar
- [ ] Notes editor (text area)
- [ ] Tags display + add/remove
- [ ] Groups list + assign/unassign
- [ ] Connected social accounts list (read-only, linked from Phase 3)
- [ ] Edit/Delete actions

---

## TASK-024: Client Groups Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-022, TASK-020

### Acceptance Criteria
- [ ] Groups grid: color-coded cards with member count
- [ ] Create/edit group dialog (name, color, description)
- [ ] Click group → member list
- [ ] Add/remove clients from group
- [ ] Drag-and-drop client between groups (optional enhancement)

---

## TASK-025: Bulk Operations UI

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-022, TASK-021

### Acceptance Criteria
- [ ] Floating toolbar when rows selected: "X selected"
- [ ] Actions dropdown: Delete, Add to Group, Remove from Group, Add Tags, Remove Tags
- [ ] Confirmation dialog for destructive actions
- [ ] Progress indicator during operation
- [ ] Success/failure toast with counts
