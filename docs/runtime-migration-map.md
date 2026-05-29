# Runtime Migration Map

Maps every Next.js API route to its current responsibility, implicit dependencies, and whether it should stay in Next or migrate to the Python worker.

## Legend

- **Chain**: `P` = primary generation pipeline, `S` = secondary/supporting, `C` = CRUD
- **Migrate**: `full` = move entire logic to worker, `partial` = split between Next and worker, `stay` = keep in Next
- **Deps**: `TS` = TypeScript constant, `DB` = database field/table, `ENV` = environment variable

---

## Primary Pipeline (P)

### Route: `chat/send` — AI generation (streaming)

**Chain**: P · **Migrate**: `partial`

**Current flow:**
```
auth → validate body → check credits → read project → build prompt → fetch AI (streaming) → parse SSE → extract HTML → save draft_html
```

**Implicit dependencies:**

| Dep | Source | Used for |
|-----|--------|----------|
| `AI_API_BASE_URL` | ENV | API endpoint |
| `AI_API_KEY` | ENV | Authentication |
| `AI_MODEL` | ENV | Model selection |
| `SKILLS` (TS) | `config/skills.ts` | Skill prompts in `buildUserPrompt` |
| `projects.current_html` | DB | Context in prompt |
| `projects.design_profile` | DB | Design constraints in prompt |
| `projects.template_id` | DB | Template manifest lookup |
| `users.credits` | DB | Pre-flight credit check |
| `buildSystemPrompt()` | `lib/prompt.ts` | System prompt generation |
| `buildUserPrompt()` | `lib/prompt.ts` | User prompt generation |
| `extractGeneratedHtml()` | `lib/ai/html.ts` | Parse AI response |
| `mapProfileToPromptText()` | `config/design/mapper.ts` | Design profile → text |
| `getManifest()` (TS) | `config/manifests/index.ts` | Template slots |

**Migration boundary:**

| Stays in Next | Moves to worker |
|---------------|-----------------|
| Auth | Config validation |
| Request body parsing | Prompt building |
| DB read/write (project, users) | AI model call (text_model operator) |
| Streaming response handling | HTML extraction & validation |
| | Template manifest resolution |

**Architecture note:** The streaming case is the hardest migration point. The worker's `text_model` operator returns the full generated string, but the current route streams partial content to the client for live preview. Phase 5 needs a streaming bridge or a two-phase approach (stream directly from Next → worker on commit).

---

### Route: `chat/commit` — Validate & commit version

**Chain**: P · **Migrate**: `partial`

**Current flow:**
```
auth → validate body → read project → validate HTML against skills → commit via DB RPC → clear draft
```

**Implicit dependencies:**

| Dep | Source | Used for |
|-----|--------|----------|
| `SKILLS` (TS) | `config/skills.ts` | Validation rules |
| `validateGeneratedHtml()` | `lib/ai/validate.ts` | HTML validation |
| `commit_draft_transaction` | DB (RPC) | Atomic version commit |
| `projects.draft_html` | DB | HTML to validate & commit |
| `projects.selected_skills` | DB | Which validation rules apply |

**Migration boundary:**

| Stays in Next | Moves to worker |
|---------------|-----------------|
| Auth | HTML validation (skill rules) |
| DB RPC call (commit) | — |
| Credit deduction | — |

The validation logic (`validateGeneratedHtml`) is tightly coupled to the TS `Skill` type and its `validationRules`. If migrated, the worker needs a corresponding validation schema. Low priority — keep in Next for now.

---

### Route: `chat/repair` — Retry failed generation

**Chain**: P · **Migrate**: `partial`

**Current flow:**
```
auth → validate body → read project → build repair prompt → fetch AI (non-streaming) → extract HTML → save draft
```

**Implicit dependencies:**

| Dep | Source | Used for |
|-----|--------|----------|
| `AI_API_BASE_URL` | ENV | API endpoint |
| `AI_API_KEY` | ENV | Authentication |
| `AI_MODEL` | ENV | Model selection |
| `buildRepairPrompt()` | `lib/prompt.ts` | Prompt with error context |

**Migration boundary:**

Same as `chat/send` minus streaming. This is actually the simpler case — non-streaming, same `text_model` operator.

---

## Secondary (S)

### Route: `export/zip` — PWA ZIP export

**Chain**: S · **Migrate**: `partial` (or stay)

**Current flow:**
```
auth → validate body → read project → extract manifest → generate icons → generate SW → build ZIP → stream response
```

**Implicit dependencies:**

| Dep | Source | Used for |
|-----|--------|----------|
| `JSZip` | npm package | ZIP generation |
| `projects.current_html` | DB | Source HTML |
| `projects.name` | DB | App name |

**Migration boundary:**

This route is self-contained PWA packaging. It could become an `export` operator in the worker, but JSZip is npm-only. Two paths:
1. Implement ZIP in Python (`zipfile` stdlib) → migrate fully
2. Keep in Next as a standalone export endpoint

Recommend: **keep in Next** for now. The export operator in Phase 4 can start with HTML/PNG/JPG targets; ZIP stays as a direct Next endpoint.

### Route: `export/publish` + `status` + `revoke` — Publish management

**Chain**: S · **Migrate**: `stay`

Pure DB CRUD. No value in moving to worker.

---

## CRUD (C)

### Routes: projects, versions, templates, credits, onboarding, auth

**Chain**: C · **Migrate**: `stay`

Standard REST CRUD wrapping Supabase. These stay in Next.js permanently.

---

## Summary: Migration Priority

```
Priority 1 (Phase 4):  Operators layer
  text_model operator   ← chat/send + chat/repair core AI call
  export operator        ← export/zip alternative (HTML/PNG/JPG targets)

Priority 2 (Phase 5):   Pipeline adapter in Next
  chat/send   → pipe config through worker, get result, store
  chat/repair → same pattern (easier: non-streaming)
  chat/commit → HTML validation (low priority)

Stay in Next indefinitely:
  projects/*       (CRUD)
  versions/*       (CRUD)
  credits/*        (simple query)
  onboarding/*     (simple read/write)
  export/publish/* (publish management)
  auth/*           (NextAuth)
  templates/*      (static file serve)
```
