# Phase 6: AI Content Generation

## TASK-050: Prisma Schema — AI Entities

**Agent**: db
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-040

### Acceptance Criteria
- [ ] `AiGeneration` model: id, agency_id, user_id, prompt, result (Json), model (CLAUDE/OPENAI enum), tokens_used, cost_cents, status (PENDING/COMPLETED/FAILED enum), timestamps
- [ ] `ContentTemplate` model: id, agency_id, name, platform (nullable), template (Json), variables (String[]), is_system (boolean), timestamps
- [ ] Migration applied

---

## TASK-051: AI Module — SDK Integration

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-050, TASK-011

### Description
Anthropic (Claude) ve OpenAI SDK entegrasyonu. Provider abstraction layer.

### Acceptance Criteria
- [ ] `AiProvider` interface: generate(prompt, options) → result
- [ ] `ClaudeProvider` — Anthropic SDK with streaming support
- [ ] `OpenAiProvider` — OpenAI SDK with streaming support
- [ ] Provider selection: Claude primary, OpenAI fallback
- [ ] Token counting + cost calculation
- [ ] Generation history saved to DB
- [ ] `POST /api/v1/ai/generate` endpoint
- [ ] `GET /api/v1/ai/history` endpoint

---

## TASK-052: Content Generation Service

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-051

### Description
Platform-specific prompts, tone control, post turune gore icerik uretimi.

### Acceptance Criteria
- [ ] Generate post text for specific platform (character limits, hashtag style)
- [ ] Tone options: professional, casual, humorous, formal, inspirational
- [ ] Language support: Turkish, English (at minimum)
- [ ] Input: topic/keywords, platform, tone, length preference
- [ ] Output: multiple variants (3 options), suggested hashtags, emoji suggestions
- [ ] Template variable interpolation (brand name, product, date, etc.)
- [ ] Image description generation (for alt text)

---

## TASK-053: Content Template CRUD

**Agent**: backend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-051

### Acceptance Criteria
- [ ] `GET /api/v1/ai/templates` — list templates (system + custom)
- [ ] `POST /api/v1/ai/templates` — create custom template
- [ ] `PATCH /api/v1/ai/templates/:id` — update template
- [ ] `DELETE /api/v1/ai/templates/:id` — delete (only custom)
- [ ] System templates: "Product Launch", "Event Promo", "Blog Share", "Quote", "Poll"
- [ ] Template format: prompt text with {{variable}} placeholders

---

## TASK-054: AI Usage Tracking + Credit Enforcement

**Agent**: backend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-051, TASK-011

### Acceptance Criteria
- [ ] Track AI generations per agency per month
- [ ] Plan-based credit limits (e.g., Free: 50, Pro: 500, Enterprise: unlimited)
- [ ] `GET /api/v1/ai/usage` — current usage vs limit
- [ ] Block generation when limit reached (return 429 + upgrade prompt)
- [ ] Usage reset on billing cycle
- [ ] Cost tracking per generation

---

## TASK-055: AI Content Generator Page

**Agent**: frontend
**Complexity**: M
**Status**: PENDING
**Dependencies**: TASK-048, TASK-052

### Acceptance Criteria
- [ ] Prompt input: text area for topic/description
- [ ] Options: platform select, tone select, language, length
- [ ] Template quick-select (dropdown with templates)
- [ ] "Generate" button → loading state → results
- [ ] Results: 3 variant cards, each with "Use This" button
- [ ] "Use This" → insert into post editor (link to post creation)
- [ ] Generation history sidebar
- [ ] Usage meter (X/Y credits used)
- [ ] Streaming response display (live text generation)

---

## TASK-056: Content Templates Management Page

**Agent**: frontend
**Complexity**: S
**Status**: PENDING
**Dependencies**: TASK-015, TASK-053

### Acceptance Criteria
- [ ] Templates list: system (locked) + custom (editable)
- [ ] Create template dialog: name, platform, prompt with variable editor
- [ ] Edit/delete custom templates
- [ ] Preview template with sample data
- [ ] Variable helper: click to insert {{variable}} placeholders
