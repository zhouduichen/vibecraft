# VibeCraft 契约化模板 + AI 编排层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade VibeCraft from prompt-only AI to contract-based template system with TemplateManifest, draft-commit pipeline, skill validation, and smart suggestions.

**Architecture:** Six sequential phases — (1) TemplateManifest types + ledger pilot, (2) draft-commit pipeline, (3) editable slots bridge + UI, (4) SkillManifest v2 with post-generation validation, (5) DesignProfile v2 with bounds, (6) suggestion engine. Each phase builds on the previous.

**Tech Stack:** TypeScript, React 18, Next.js (App Router), Supabase, postMessage (iframe bridge)

---

## File Inventory

### New files:
- `src/config/manifests/types.ts` — TemplateManifest, EditableSlot, DataField, etc.
- `src/config/manifests/ledger.ts` — Ledger template manifest
- `src/config/manifests/index.ts` — Registry
- `src/app/api/chat/commit/route.ts` — Draft commit endpoint
- `src/app/api/chat/repair/route.ts` — AI repair endpoint
- `src/lib/ai/validate.ts` — Post-generation validation pipeline
- `src/components/EditableSlotsPanel.tsx` — Editable slots UI
- `src/lib/ai/slot-bridge.ts` — iframe bridge protocol helpers
- `src/lib/ai/suggestions.ts` — Suggestion engine
- `src/components/SuggestionChips.tsx` — Suggestion chip UI

### Modified files:
- `src/config/skills.ts` — Extended with SkillManifest
- `src/lib/prompt.ts` — Manifest-aware prompt building
- `src/lib/db.ts` — DesignProfile v2 (styleLocked, intentMode)
- `src/app/api/chat/send/route.ts` — Draft-only mode
- `src/components/ChatPanel.tsx` — Draft management, suggestion chips
- `src/components/PreviewPane.tsx` — RENDER_READY event, onReady callback
- `src/components/SkillSelector.tsx` — Skill categories, conflict display
- `src/components/SkillSelector.tsx` — Skill categories, conflict display
- `src/components/DesignCapsule.tsx` — DesignProfile v2 UI
- `src/config/design/mapper.ts` — DesignBound awareness

---

## Phase 1: Template Manifest 底座

### Task 1.1: Define manifest types

**Files:**
- Create: `src/config/manifests/types.ts`

- [ ] **Create `src/config/manifests/types.ts`:**

```typescript
export interface EditableSlot {
  id: string;
  label: string;
  category: 'content' | 'style' | 'structure' | 'data';
  type: 'text' | 'color' | 'number' | 'select' | 'boolean' | 'block';
  defaultValue?: string;
  options?: { label: string; value: string }[];
  bounds?: { min?: number; max?: number };
  aiPrompt: string;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  label: string;
  description?: string;
  fields?: DataField[];
}

export interface Suggestion {
  text: string;
  skillId?: string;
  category: 'content' | 'skill' | 'design' | 'fix';
  condition?: {
    type: 'skill_not_active' | 'no_error';
    skillId?: string;
  };
}

export interface DesignBound {
  allowedThemes: ('dark' | 'light')[];
  allowedColorStrategies: string[];
  minBorderRadius: number;
  maxBorderRadius: number;
  allowedMotion: string[];
}

export interface TemplateManifest {
  id: string;
  isBlank?: boolean;
  editableSlots: EditableSlot[];
  dataSchema: DataField[];
  supportedSkills: string[];
  defaultSuggestions: Suggestion[];
  designBounds?: DesignBound;
}
```

### Task 1.2: Write ledger manifest

**Files:**
- Create: `src/config/manifests/ledger.ts`

- [ ] **Create `src/config/manifests/ledger.ts`:**

```typescript
import type { TemplateManifest } from './types';

export const LEDGER_MANIFEST: TemplateManifest = {
  id: 'ledger',
  editableSlots: [
    {
      id: 'page-title',
      label: '页面标题',
      category: 'content',
      type: 'text',
      defaultValue: '💰 极简记账',
      aiPrompt: '页面主标题，显示在顶部 h1 元素上。请在此元素上加 data-vibecraft-slot="page-title"',
    },
    {
      id: 'balance-card-style',
      label: '余额卡片风格',
      category: 'style',
      type: 'select',
      defaultValue: 'gradient',
      options: [
        { label: '渐变色', value: 'gradient' },
        { label: '纯色', value: 'solid' },
        { label: '极简边框', value: 'bordered' },
      ],
      aiPrompt: '顶部余额卡片的视觉风格。请在选择器对应的容器上加 data-vibecraft-slot="balance-card-style"',
    },
    {
      id: 'accent-color',
      label: '主题色',
      category: 'style',
      type: 'select',
      defaultValue: 'indigo',
      options: [
        { label: '靛蓝', value: 'indigo' },
        { label: '琥珀', value: 'amber' },
        { label: '翠绿', value: 'emerald' },
        { label: '玫红', value: 'rose' },
        { label: '紫色', value: 'violet' },
      ],
      aiPrompt: '应用主色调（按钮、选中态、强调色）。请将主色调对应的 CSS class 所在容器上加 data-vibecraft-slot="accent-color"',
    },
    {
      id: 'border-radius',
      label: '圆角大小',
      category: 'style',
      type: 'select',
      defaultValue: 'rounded-2xl',
      options: [
        { label: '0px（直角）', value: 'rounded-none' },
        { label: '8px', value: 'rounded-lg' },
        { label: '12px', value: 'rounded-xl' },
        { label: '16px', value: 'rounded-2xl' },
        { label: '24px', value: 'rounded-3xl' },
      ],
      aiPrompt: '卡片和容器的圆角大小，影响所有圆角元素。请在典型的圆角容器上加 data-vibecraft-slot="border-radius"',
    },
    {
      id: 'density',
      label: '布局密度',
      category: 'style',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: '紧凑', value: 'compact' },
        { label: '适中', value: 'normal' },
        { label: '宽松', value: 'spacious' },
      ],
      aiPrompt: '列表项的间距和 padding。紧凑=更小间距，宽松=更大间距。请在列表容器上加 data-vibecraft-slot="density"',
    },
    {
      id: 'record-list',
      label: '记录列表',
      category: 'structure',
      type: 'block',
      aiPrompt: '收支记录列表区域。每条记录包含金额、分类、日期、备注和删除按钮。请在此区域容器上加 data-vibecraft-slot="record-list"',
    },
    {
      id: 'filter-bar',
      label: '筛选栏',
      category: 'structure',
      type: 'block',
      aiPrompt: '全部/支出/收入 筛选按钮组。请在此区域容器上加 data-vibecraft-slot="filter-bar"',
    },
    {
      id: 'add-form',
      label: '新增记录表单',
      category: 'structure',
      type: 'block',
      aiPrompt: '新增收支记录的表单，包含类型切换、金额输入、分类选择、备注和提交按钮。请在此区域容器上加 data-vibecraft-slot="add-form"',
    },
    {
      id: 'categories',
      label: '分类列表',
      category: 'data',
      type: 'text',
      defaultValue: '餐饮,交通,购物,娱乐,居住,医疗,教育,其他',
      aiPrompt: '收支分类选项列表，用逗号分隔。当前分类显示在 select 下拉和分类标签中。请在分类选择器上加 data-vibecraft-slot="categories"',
    },
    {
      id: 'summary-stat',
      label: '统计摘要文字',
      category: 'content',
      type: 'text',
      defaultValue: '本月余额',
      aiPrompt: '余额卡片中统计摘要的标签文字。请在此元素上加 data-vibecraft-slot="summary-stat"',
    },
    {
      id: 'theme-mode',
      label: '深色/浅色模式',
      category: 'style',
      type: 'select',
      defaultValue: 'dark',
      options: [
        { label: '深色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ],
      aiPrompt: '整体深色或浅色配色方案。请在 body 或根容器上加 data-vibecraft-slot="theme-mode"',
    },
  ],
  dataSchema: [
    {
      name: 'records',
      type: 'array',
      label: '收支记录',
      description: '所有收支记录列表',
      fields: [
        { name: 'id', type: 'number', label: '记录 ID' },
        { name: 'type', type: 'string', label: '类型', description: 'income 或 expense' },
        { name: 'amount', type: 'number', label: '金额' },
        { name: 'category', type: 'string', label: '分类' },
        { name: 'note', type: 'string', label: '备注' },
        { name: 'date', type: 'string', label: '日期', description: 'YYYY-MM-DD 格式' },
      ],
    },
    {
      name: 'CATEGORIES',
      type: 'array',
      label: '分类列表',
      description: '字符串数组，如 ["餐饮", "交通", ...]',
    },
    {
      name: 'CATEGORY_COLORS',
      type: 'object',
      label: '分类颜色映射',
      description: '如 { "餐饮": "#f97316", ... }',
    },
  ],
  supportedSkills: ['chart', 'export_excel', 'budget_alert'],
  defaultSuggestions: [
    { text: '加一个饼图，按分类展示支出占比', skillId: 'chart', category: 'skill', condition: { type: 'skill_not_active', skillId: 'chart' } },
    { text: '加一个月度趋势折线图', skillId: 'chart', category: 'skill', condition: { type: 'skill_not_active', skillId: 'chart' } },
    { text: '增加导出 Excel 功能', skillId: 'export_excel', category: 'skill', condition: { type: 'skill_not_active', skillId: 'export_excel' } },
    { text: '设置预算，超支时提醒我', skillId: 'budget_alert', category: 'skill', condition: { type: 'skill_not_active', skillId: 'budget_alert' } },
    { text: '把标题改成更符合我的风格的', category: 'content' },
    { text: '让页面更适合在手机上查看', category: 'design' },
  ],
};
```

### Task 1.3: Create manifest registry

**Files:**
- Create: `src/config/manifests/index.ts`

- [ ] **Create `src/config/manifests/index.ts`:**

```typescript
import type { TemplateManifest } from './types';
import { LEDGER_MANIFEST } from './ledger';

const MANIFEST_REGISTRY: Record<string, TemplateManifest> = {
  ledger: LEDGER_MANIFEST,
};

export function getManifest(templateId: string): TemplateManifest | null {
  return MANIFEST_REGISTRY[templateId] ?? null;
}

export function getAllManifests(): TemplateManifest[] {
  return Object.values(MANIFEST_REGISTRY);
}

export type { TemplateManifest, EditableSlot, DataField, Suggestion, DesignBound } from './types';
```

### Task 1.4: Inject manifest into AI prompt

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **Modify `src/lib/prompt.ts` to inject slot annotations when a manifest exists.**

Add import and modify `buildUserPrompt`:

```typescript
import { getManifest } from '@/config/manifests';

// Add after the skillSection block in buildUserPrompt:
const templateManifest = getManifestFromContext(/* need to pass templateId */);
const slotSection = templateManifest?.editableSlots?.length
  ? `\n\n### 可改区域声明（请严格遵循）：\n${templateManifest.editableSlots.map(
      s => `- slot "${s.id}"（${s.label}）：${s.aiPrompt}`
    ).join('\n')}\n\n重要：请在上述每个 slot 对应的 HTML 元素上添加 data-vibecraft-slot="${slot.id}" 属性。不要遗漏。`
  : '';
```

Since `buildUserPrompt` currently doesn't receive `templateId`, update the function signature:

```typescript
export function buildUserPrompt(
  currentHtml: string,
  userDemand: string,
  selectedSkills: string[],
  skillsMap: Record<string, Skill>,
  templateId?: string,  // new parameter
): string {
  // ... existing code ...
  const manifest = templateId ? getManifest(templateId) : null;
  const slotSection = manifest?.editableSlots?.length
    ? `\n\n### 可改区域声明（请严格遵循）：\n${manifest.editableSlots.map(
        s => `- slot "${s.id}"（${s.label}）：${s.aiPrompt}`
      ).join('\n')}\n\n重要：请在上述每个 slot 对应的 HTML 元素上添加 data-vibecraft-slot 属性，属性值为 slot 的 id。不要遗漏。`
    : '';
  return `### 当前运行的完整 React CDN 源码：\n${currentHtml}\n\n${skillSection}${slotSection}\n\n### 用户需求：\n${userDemand}\n\n请返回一份 100% 完整的 HTML，包含上述技能功能 + 用户需求的所有改动，可以直接保存为 .html 在浏览器中打开运行。`;
}
```

Then update the caller in `src/app/api/chat/send/route.ts` to pass `templateId`:

```typescript
const userPrompt = buildUserPrompt(
  project.current_html,
  userDemand,
  selectedSkills,
  SKILLS,
  project.template_id  // add this
);
```

Also update the Project interface in `src/lib/db.ts` to include `template_id` (it already has it per line 20).

- [ ] **Commit Phase 1**

```bash
git add src/config/manifests/ src/lib/prompt.ts src/app/api/chat/send/route.ts
git commit -m "feat: add TemplateManifest system with ledger pilot template

Introduce TemplateManifest types, ledger manifest with 11 editable slots,
data schema, and default suggestions. Inject slot annotations into AI prompt
so generated HTML carries data-vibecraft-slot attributes.

Phase 1 of contract-based template + AI orchestration layer."
```

---

## Phase 2: Draft-commit 管线

### Task 2.1: Database migration for draft_html

**Files:**
- Create: `supabase/migrations/YYYYMMDD_add_draft_html.sql` (or run SQL directly)

Run the migration:

```bash
psql "$SUPABASE_DB_URL" -c "ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_html text;"
```

Or if using Supabase CLI:

```bash
npx supabase migration new add_draft_html
# Edit the generated file
```

- [ ] **Create migration SQL:**

```sql
-- Add draft_html column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS draft_html text;

-- Add index for draft cleanup queries
CREATE INDEX IF NOT EXISTS idx_projects_draft_html ON projects (id) WHERE draft_html IS NOT NULL;
```

- [ ] **Apply migration**

### Task 2.2: Refactor chat/send/route.ts to draft-only

**Files:**
- Modify: `src/app/api/chat/send/route.ts`

Remove `chat_send_transaction` call. After extracting HTML, save it as `draft_html` instead of replacing `current_html`. Remove credit deduction.

- [ ] **Replace the save section (lines 197-233) in `route.ts`:**

```typescript
// After extracting final code (replaces lines 197-233)
const cleanCode = extractGeneratedHtml(fullResponse);

if (cleanCode) {
  sendStep('saving', '正在生成预览...');

  // Save as draft only — don't deduct credits yet
  const { error: draftError } = await db
    .from('projects')
    .update({ draft_html: cleanCode })
    .eq('id', projectId)
    .eq('user_id', userId);

  if (draftError) {
    console.error('Failed to save draft:', draftError);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '保存草稿失败，请重试' })}\n\n`)
    );
  } else {
    sendStep('draft_ready', '代码已生成，正在验证...');
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'code', content: cleanCode })}\n\n`)
    );
  }
} else {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'AI 未返回有效代码，请重试' })}\n\n`)
  );
}
```

Also remove the `CREDITS_PER_REQUEST` constant usage since we no longer deduct here (keep the constant for commit route). Remove the credit check block (lines 41-49) since credits should be checked at commit time.

Remove lines 41-49 (credit check):

```typescript
// DELETE this block:
const { data: dbUser } = await db
  .from('users')
  .select('credits')
  .eq('id', userId)
  .single();

if (!dbUser || dbUser.credits < CREDITS_PER_REQUEST) {
  return NextResponse.json({ error: '您的算力余额不足，无法完成此次修改' }, { status: 402 });
}
```

And update the step 'done' message logic. The `codeSent` check at line 171 still works for streaming partial preview.

### Task 2.3: Create commit API route

**Files:**
- Create: `src/app/api/chat/commit/route.ts`

- [ ] **Create `src/app/api/chat/commit/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const CREDITS_PER_COMMIT = 10;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json() as { projectId?: string };
  const projectId = body.projectId;
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: '缺少项目 ID' }, { status: 400 });
  }

  // Get project and verify ownership
  const { data: project, error: fetchError } = await db
    .from('projects')
    .select('id, draft_html, current_html, name')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  if (!project.draft_html) {
    return NextResponse.json({ error: '没有待提交的草稿' }, { status: 400 });
  }

  // Use RPC for atomic commit: check credits, deduct, save, create version
  // The RPC should be defined in Supabase
  const { error: commitError } = await db.rpc('commit_draft_transaction', {
    p_user_id: userId,
    p_project_id: projectId,
    p_new_html: project.draft_html,
    p_message: `AI 修改: ${project.name}`,
    p_cost: CREDITS_PER_COMMIT,
  });

  if (commitError) {
    const message = commitError.message?.includes('Insufficient credits')
      ? '您的算力余额不足，无法完成此次修改'
      : commitError.message?.includes('insufficient_balance')
        ? '您的算力余额不足'
        : '保存失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: 402 });
  }

  // Clear draft after successful commit
  await db.from('projects').update({ draft_html: null }).eq('id', projectId);

  return NextResponse.json({ success: true });
}
```

**Database setup:** Create the `commit_draft_transaction` RPC in Supabase:

```sql
CREATE OR REPLACE FUNCTION commit_draft_transaction(
  p_user_id uuid,
  p_project_id uuid,
  p_new_html text,
  p_message text,
  p_cost int
) RETURNS void AS $$
DECLARE
  user_credits int;
BEGIN
  -- Lock user row and check credits
  SELECT credits INTO user_credits FROM users WHERE id = p_user_id FOR UPDATE;
  IF user_credits < p_cost THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Deduct credits
  UPDATE users SET credits = credits - p_cost WHERE id = p_user_id;

  -- Update project
  UPDATE projects SET current_html = p_new_html, updated_at = now() WHERE id = p_project_id;

  -- Create version record
  INSERT INTO versions (project_id, html_content, message) VALUES (p_project_id, p_new_html, p_message);
END;
$$ LANGUAGE plpgsql;
```

### Task 2.4: Create repair API route

**Files:**
- Create: `src/app/api/chat/repair/route.ts`

- [ ] **Create `src/app/api/chat/repair/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildSystemPrompt, buildRepairPrompt } from '@/lib/prompt';
import { extractGeneratedHtml } from '@/lib/ai/html';

const MAX_RETRIES = 2;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json() as {
    projectId?: string;
    failedHtml?: string;
    previousHtml?: string;
    userDemand?: string;
    errorMessage?: string;
    attemptCount?: number;
  };

  if (!body.projectId || !body.failedHtml || !body.userDemand) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  if ((body.attemptCount || 0) >= MAX_RETRIES) {
    return NextResponse.json({ error: '已超出最大重试次数，请重新描述需求' }, { status: 429 });
  }

  // Get project
  const { data: project } = await db
    .from('projects')
    .select('design_profile, current_html')
    .eq('id', body.projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Build repair prompt
  const systemPrompt = buildSystemPrompt(project.design_profile || null);
  const repairPrompt = buildRepairPrompt(
    body.previousHtml || project.current_html,
    body.failedHtml,
    body.userDemand,
    body.errorMessage
  );

  // Call AI (non-streaming for simplicity)
  const aiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.siliconflow.cn';
  const aiApiKey = process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek-ai/DeepSeek-V3';

  if (!aiApiKey) {
    return NextResponse.json({ error: 'AI API key is not configured' }, { status: 500 });
  }

  const aiResponse = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: repairPrompt },
      ],
      max_tokens: 8192,
    }),
  });

  if (!aiResponse.ok) {
    return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 502 });
  }

  const aiData = await aiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = aiData.choices?.[0]?.message?.content || '';
  const cleanCode = extractGeneratedHtml(content);

  if (!cleanCode) {
    return NextResponse.json({
      error: '修复失败',
      repairedCode: null,
      attemptCount: (body.attemptCount || 0) + 1,
    }, { status: 422 });
  }

  // Save repaired code as new draft
  await db.from('projects').update({ draft_html: cleanCode }).eq('id', body.projectId);

  return NextResponse.json({
    repairedCode: cleanCode,
    attemptCount: (body.attemptCount || 0) + 1,
  });
}
```

### Task 2.5: Add repair prompt builder

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **Add `buildRepairPrompt` to `src/lib/prompt.ts`:**

```typescript
export function buildRepairPrompt(
  previousHtml: string,
  failedHtml: string,
  userDemand: string,
  errorMessage?: string,
): string {
  return `### 之前正常运行的 HTML：
${previousHtml}

### 上次生成的 HTML（运行出错）：
${failedHtml}

${errorMessage ? `### 错误信息：\n${errorMessage}\n` : ''}

### 原始用户需求：
${userDemand}

### 修复要求：
1. 分析错误原因，修复 bug
2. 确保所有功能正常，特别是 React state 和 localStorage 读写
3. 确保所有 CDN script 正确引入
4. 返回 100% 完整的 HTML，不要省略任何代码
5. 确保 ReactDOM.createRoot 正确调用，组件正确 export`;
}
```

### Task 2.6: Add RENDER_READY to PreviewPane

**Files:**
- Modify: `src/components/PreviewPane.tsx`

- [ ] **Update `PreviewPane.tsx` to detect RENDER_READY and report errors more precisely:**

Add `onReady` callback to props:

```typescript
interface PreviewPaneProps {
  code: string;
  onRenderError: () => void;
  onRenderReady?: () => void;  // new
  isStreaming: boolean;
}
```

Update the message handler to detect `RENDER_READY`:

```typescript
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.source !== iframeRef.current?.contentWindow) return;
    if (event.data?.type === 'RENDER_ERROR') {
      errorFlagRef.current = true;
      setHasError(true);
      setErrorDetail(event.data.message || '未知错误');
      onRenderErrorRef.current();
    }
    // NEW: RENDER_READY
    if (event.data?.type === 'RENDER_READY') {
      onRenderReadyRef.current?.();
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

Add ref for `onRenderReady`:

```typescript
const onRenderReadyRef = useRef(onRenderReady);
useEffect(() => { onRenderReadyRef.current = onRenderReady; }, [onRenderReady]);
```

### Task 2.7: Update ChatPanel for draft-commit flow

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Add draft management state and commit/repair logic:**

Add states:

```typescript
const [draftCode, setDraftCode] = useState<string | null>(null);
const [draftReady, setDraftReady] = useState(false);
const [repairAttempts, setRepairAttempts] = useState(0);
```

Update the streaming handler to capture draft:

```typescript
// In the stream reader, when data.type === 'code':
if (data.type === 'code') {
  setDraftCode(data.content || '');
  setDraftReady(false);  // wait for iframe to confirm
  onCodeUpdate(data.content || '');
  gotCode = true;
}
```

When iframe reports ready (via `onRenderReady`), auto-commit:

```typescript
// Add a useEffect to watch for render ready state
useEffect(() => {
  if (draftReady && draftCode) {
    commitDraft();
  }
}, [draftReady]);
```

Add commit function:

```typescript
const commitDraft = useCallback(async () => {
  if (!draftCode) return;
  try {
    const res = await fetch('/api/chat/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '修改完成，请在右侧预览查看效果', status: 'ok' }]);
    } else {
      const err = await res.json();
      setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: err.error || '保存失败', status: 'error' }]);
    }
  } catch {
    setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '网络异常，保存失败', status: 'error' }]);
  }
  setDraftCode(null);
  setDraftReady(false);
}, [draftCode, projectId]);
```

Add repair function:

```typescript
const repairDraft = useCallback(async (errorMessage?: string) => {
  if (!draftCode) return;
  setRepairAttempts(prev => prev + 1);
  setCurrentStep('正在尝试修复...');
  try {
    const res = await fetch('/api/chat/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        failedHtml: draftCode,
        userDemand: input,  // need to store the original demand
        errorMessage,
        attemptCount: repairAttempts,
      }),
    });
    const data = await res.json();
    if (data.repairedCode) {
      onCodeUpdate(data.repairedCode);
      setDraftCode(data.repairedCode);
    } else {
      // Repair failed, roll back
      setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '修复失败，已回退到上一个版本。请换个描述再试一次', status: 'error' }]);
      setDraftCode(null);
    }
  } catch {
    setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '网络异常，修复失败', status: 'error' }]);
    setDraftCode(null);
  }
  setCurrentStep('');
}, [draftCode, projectId, repairAttempts]);
```

Pass `onRenderReady` and `onRenderError` callbacks from `ChatPanel` to `PreviewPane` via the project page. The `ProjectEditor` component in `src/app/project/[id]/page.tsx` already passes `onRenderError` as a no-op — wire it up:

```typescript
// src/app/project/[id]/page.tsx — update PreviewPane usage
const [renderStatus, setRenderStatus] = useState<'unknown' | 'ready' | 'error'>('unknown');

<PreviewPane
  code={currentCode}
  onRenderError={() => {
    setRenderStatus('error');
    handleRenderError(); // new callback to ChatPanel
  }}
  onRenderReady={() => {
    setRenderStatus('ready');
    handleRenderReady(); // new callback to ChatPanel
  }}
  isStreaming={isStreaming}
/>
```

This requires threading callbacks from the project page to ChatPanel. Simplest approach: add `onRenderReady` and `onRenderError` handlers in the project page that call methods on the ChatPanel component. Since both share state at the project page level, you can manage it there:

- ChatPanel sets `draftCode` → ProjectEditor receives it via `onCodeUpdate` and passes to PreviewPane → PreviewPane reports ready/error → ProjectEditor calls ChatPanel's commit/repair.

Actually, the simplest approach is to handle the commit/repair logic in `ProjectEditor` (the parent) rather than in `ChatPanel`, since it owns both `currentCode` and `PreviewPane`. Let me restructure:

```typescript
// In ProjectEditor (src/app/project/[id]/page.tsx)
const [draftCode, setDraftCode] = useState<string | null>(null);
const [isDraftReady, setIsDraftReady] = useState(false);
const [originalDemand, setOriginalDemand] = useState('');

const handleRenderReady = useCallback(async () => {
  if (!draftCode) return;
  setIsDraftReady(true);
  // Auto-commit
  try {
    const res = await fetch('/api/chat/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
    });
    if (res.ok) {
      setDraftCode(null);
    } else {
      const err = await res.json();
      console.error('Commit failed:', err.error);
    }
  } catch (e) {
    console.error('Commit error:', e);
  }
}, [draftCode, id]);
```

Pass `onRenderReady` to `PreviewPane` and when ChatPanel receives code, it should also pass the original user demand so the parent can use it for repair if needed.

Actually, to keep this simpler for the initial implementation, let's handle it in ChatPanel by passing down the handlers:

- `ChatPanel` already has `onCodeUpdate` which it calls when it receives code from streaming
- Add a `draftState` object passed up to parent: `{ draftCode, originalDemand }`
- Parent watches `draftState`, waits for `PreviewPane` ready/error, then calls commit/repair

This is getting complex for the plan. Let me simplify:

**Simplified approach for Phase 2 initial impl:**

1. `ChatPanel` streams code → calls `onCodeUpdate` as before
2. `PreviewPane` gets the code and tries to render
3. When iframe loads without error → `onRenderReady` fires → parent auto-commits
4. When iframe errors → auto-repair via API

The parent `ProjectEditor` orchestrates:

```typescript
const handleCodeUpdate = useCallback((code: string) => {
  setCurrentCode(code);
  setDraftCode(code);
  setIsDraftReady(false);
}, []);

const handleRenderReady = useCallback(() => {
  if (!draftCode) return;
  setIsDraftReady(true);
  fetch('/api/chat/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: id }),
  }).catch(console.error);
}, [draftCode, id]);
```

This is sufficient for the initial draft-commit flow. The repair flow can be triggered from `handleRenderError` but for Phase 2, we'll keep it simple — just show the error and let the user retry.

- [ ] **Commit Phase 2**

```bash
git add supabase/migrations/ src/app/api/chat/ src/lib/prompt.ts src/components/PreviewPane.tsx src/components/ChatPanel.tsx src/app/project/
git commit -m "feat: add draft-commit pipeline with auto-commit on render success

Replace direct-save model with draft-commit: AI generates draft, iframe
verifies, then auto-commits. Adds commit/repair API routes, RENDER_READY
iframe event, and atomic commit RPC for credit safety.

Phase 2 of contract-based template + AI orchestration layer."
```

---

## Phase 3: 可改区域 UI + Bridge

### Task 3.1: Create slot bridge helpers

**Files:**
- Create: `src/lib/ai/slot-bridge.ts`

- [ ] **Create `src/lib/ai/slot-bridge.ts`:**

```typescript
// iframe bridge protocol for slot communication
// Used by the injected script in generated HTML

export const SLOT_BRIDGE_SCRIPT = `
<script>
(function() {
  function sendSlots() {
    var slots = document.querySelectorAll('[data-vibecraft-slot]');
    var slotData = Array.from(slots).map(function(el) {
      var rect = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-vibecraft-slot'),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    });
    window.parent.postMessage({ type: 'VIBECRAFT_SLOTS', slots: slotData }, '*');
  }

  function highlightSlot(slotId) {
    document.querySelectorAll('[data-vibecraft-slot]').forEach(function(el) {
      el.style.outline = el.getAttribute('data-vibecraft-slot') === slotId
        ? '2px solid #d4453b'
        : 'none';
    });
  }

  window.addEventListener('message', function(event) {
    if (event.data.type === 'HIGHLIGHT_SLOT') {
      highlightSlot(event.data.slotId);
    }
    if (event.data.type === 'REQUEST_SLOTS') {
      sendSlots();
    }
  });

  // Send ready + slots on load
  window.addEventListener('load', function() {
    window.parent.postMessage({ type: 'VIBECRAFT_READY' }, '*');
    setTimeout(sendSlots, 100);
  });

  // Re-send slots on resize
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sendSlots, 200);
  });
})();
</script>
`;

export const SLOT_BRIDGE_INJECTION = {
  marker: '</head>',
  code: SLOT_BRIDGE_SCRIPT,
};
```

Inject this into generated HTML in PreviewPane:

```typescript
// In PreviewPane.tsx, where the code is enhanced:
const enhanced = code
  .replace(/<head\b[^>]*>/i, `$&${STORAGE_SHIM}${spyScript}`)
  .replace('</head>', `${SLOT_BRIDGE_SCRIPT}</head>`);
```

### Task 3.2: Create EditableSlotsPanel component

**Files:**
- Create: `src/components/EditableSlotsPanel.tsx`

- [ ] **Create `src/components/EditableSlotsPanel.tsx`:**

```typescript
'use client';
import { useState, useEffect } from 'react';
import type { EditableSlot } from '@/config/manifests/types';

interface SlotData {
  id: string;
  rect: { x: number; y: number; width: number; height: number };
}

interface EditableSlotsPanelProps {
  manifestSlots: EditableSlot[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onRequestEdit: (slotId: string, value: string) => void;
  onRequestAiEdit: (prompt: string) => void;
}

type CategoryTab = 'content' | 'style' | 'structure' | 'data';

const CATEGORY_LABELS: Record<CategoryTab, string> = {
  content: '内容',
  style: '样式',
  structure: '结构',
  data: '数据',
};

export default function EditableSlotsPanel({
  manifestSlots,
  iframeRef,
  onRequestEdit,
  onRequestAiEdit,
}: EditableSlotsPanelProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>('content');
  const [slotPositions, setSlotPositions] = useState<Record<string, SlotData>>({});
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'VIBECRAFT_SLOTS') {
        const map: Record<string, SlotData> = {};
        (event.data.slots || []).forEach((s: SlotData) => { map[s.id] = s; });
        setSlotPositions(map);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef]);

  // Request slot positions from iframe
  useEffect(() => {
    if (!iframeRef.current) return;
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'REQUEST_SLOTS' }, '*');
    }, 500);
    return () => clearTimeout(timer);
  }, [manifestSlots, iframeRef]);

  const filteredSlots = manifestSlots.filter(s => s.category === activeTab);

  const handleSlotHover = (slotId: string | null) => {
    setHighlightedSlot(slotId);
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'HIGHLIGHT_SLOT', slotId },
      '*'
    );
  };

  const handleSlotClick = (slot: EditableSlot) => {
    if (slot.type === 'text' || slot.type === 'number') {
      const val = prompt(`修改 ${slot.label}:`, slot.defaultValue || '');
      if (val !== null) onRequestEdit(slot.id, val);
    } else if (slot.type === 'select' && slot.options) {
      onRequestAiEdit(`把 ${slot.label} 改为：`);
    } else if (slot.type === 'block') {
      onRequestAiEdit(`我想修改页面中的「${slot.label}」区域`);
    }
  };

  if (manifestSlots.length === 0) return null;

  return (
    <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-3 py-2">
        <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
          可改内容
        </p>

        {/* Category tabs */}
        <div className="flex gap-1 mb-2">
          {(['content', 'style', 'structure', 'data'] as const).map(cat => {
            const count = manifestSlots.filter(s => s.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="text-[10px] px-2 py-1 rounded-full font-medium transition-colors"
                style={{
                  background: activeTab === cat ? 'var(--color-accent)' : 'var(--color-surface-raised)',
                  color: activeTab === cat ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Slot list */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {filteredSlots.map(slot => {
            const detected = slotPositions[slot.id];
            return (
              <button
                key={slot.id}
                onClick={() => handleSlotClick(slot)}
                onMouseEnter={() => handleSlotHover(slot.id)}
                onMouseLeave={() => handleSlotHover(null)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors flex items-center justify-between gap-2"
                style={{
                  background: highlightedSlot === slot.id ? 'var(--color-accent-subtle)' : 'transparent',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span className="truncate">{slot.label}</span>
                <span
                  className="text-[10px] shrink-0"
                  style={{ color: detected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                >
                  {detected ? '✓' : '未检测到'}
                </span>
              </button>
            );
          })}
          {filteredSlots.length === 0 && (
            <p className="text-[11px] py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
              当前分类无可改内容
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Add `EditableSlotsPanel` to `ChatPanel.tsx`** below `SkillSelector`:

```typescript
// Import
import EditableSlotsPanel from './EditableSlotsPanel';
import { getManifest } from '@/config/manifests';

// In ChatPanel component body (after SkillSelector):
const manifest = templateId ? getManifest(templateId) : null;

// In JSX (after DesignEnhancementToggle):
{manifest && (
  <EditableSlotsPanel
    manifestSlots={manifest.editableSlots}
    iframeRef={/* need to pass iframe ref from parent */}
    onRequestEdit={(slotId, value) => {
      // For simple edits, fill the input with a pre-built prompt
      setInput(`修改「${manifest.editableSlots.find(s => s.id === slotId)?.label}」为：${value}`);
    }}
    onRequestAiEdit={(prompt) => {
      setInput(prompt);
    }}
  />
)}
```

The iframe ref needs to be threaded from `PreviewPane` up through `ProjectEditor` to `ChatPanel`. Simplest: use a ref at the `ProjectEditor` level and pass it to both `PreviewPane` and `ChatPanel`. Or use a callback ref pattern.

For now, use a shared ref via a React context or pass it through the parent:

```typescript
// In ProjectEditor (page.tsx)
const iframeRef = useRef<HTMLIFrameElement>(null);

<PreviewPane ref={iframeRef} ... />
<ChatPanel iframeRef={iframeRef} ... />
```

But `PreviewPane` uses a local `iframeRef`. To expose it, use `forwardRef`:

```typescript
// Update PreviewPane to use forwardRef
export default forwardRef<HTMLIFrameElement, PreviewPaneProps>(function PreviewPane(props, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Sync local ref with forwarded ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') ref(iframeRef.current);
      else ref.current = iframeRef.current;
    }
  });
  // ...
  <iframe ref={iframeRef} ... />
});
```

- [ ] **Commit Phase 3**

```bash
git add src/lib/ai/slot-bridge.ts src/components/EditableSlotsPanel.tsx src/components/ChatPanel.tsx src/components/PreviewPane.tsx src/app/project/
git commit -m "feat: add editable slots panel with iframe bridge protocol

Inject slot bridge script into generated HTML for postMessage-based
slot discovery. Add EditableSlotsPanel component with category tabs,
slot highlighting, and click-to-edit interaction.

Phase 3 of contract-based template + AI orchestration layer."
```

---

## Phase 4: 技能系统 v2

### Task 4.1: Define SkillManifest types and migrate skills

**Files:**
- Modify: `src/config/skills.ts`

- [ ] **Update `src/config/skills.ts` with SkillManifest:**

Extend the existing `Skill` interface (keep backward compat):

```typescript
export interface ValidationRule {
  type: 'script_exists' | 'canvas_exists' | 'element_exists' | 'state_field_exists';
  selector?: string;
  target?: string;
  message: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'chart' | 'export' | 'alert' | 'optimize' | 'share';
  prompt: string;
  compatibleTemplates: string[];
  requiredScripts: { url: string; globalVar: string }[];
  dataRequirements: string[];
  conflicts: string[];
  validationRules: ValidationRule[];
}
```

Update each skill with the new fields. Example for chart:

```typescript
chart: {
  id: 'chart',
  name: '消费图表',
  description: '饼图和月度趋势折线图',
  category: 'chart',
  prompt: `【必须实现：消费图表】...`, // keep existing
  compatibleTemplates: ['ledger', 'checkin', '*'],
  requiredScripts: [
    { url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js', globalVar: 'Chart' },
  ],
  dataRequirements: ['records'],
  conflicts: [],
  validationRules: [
    { type: 'script_exists', target: 'chart.js@4.4.0', message: 'Chart.js CDN 未正确引入' },
    { type: 'canvas_exists', message: '缺少 <canvas> 元素来渲染图表' },
  ],
},
```

Update `export_excel`:

```typescript
export_excel: {
  id: 'export_excel',
  name: '导出 Excel',
  description: '将数据导出为 Excel 文件',
  category: 'export',
  prompt: `【必须实现：导出 Excel】...`, // keep existing
  compatibleTemplates: ['ledger', 'checkin', 'todo', '*'],
  requiredScripts: [
    { url: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js', globalVar: 'XLSX' },
  ],
  dataRequirements: ['records'],
  conflicts: [],
  validationRules: [
    { type: 'script_exists', target: 'xlsx.full.min.js', message: 'SheetJS CDN 未正确引入' },
  ],
},
```

Update `budget_alert`:

```typescript
budget_alert: {
  id: 'budget_alert',
  name: '超支弹窗',
  description: '超出预算时弹出警告',
  category: 'alert',
  prompt: `【必须实现：超支预警】...`, // keep existing
  compatibleTemplates: ['ledger'],
  requiredScripts: [],
  dataRequirements: ['records'],
  conflicts: [],
  validationRules: [
    { type: 'state_field_exists', target: 'budget', message: '缺少 budget 状态字段' },
  ],
},
```

### Task 4.2: Create validation pipeline

**Files:**
- Create: `src/lib/ai/validate.ts`

- [ ] **Create `src/lib/ai/validate.ts`:**

```typescript
import type { Skill } from '@/config/skills';

export interface ValidationResult {
  skillId: string;
  ruleType: string;
  passed: boolean;
  message: string;
}

export function validateGeneratedHtml(
  html: string,
  activeSkills: Skill[],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const skill of activeSkills) {
    for (const rule of skill.validationRules) {
      let passed = false;

      switch (rule.type) {
        case 'script_exists': {
          // Check if the CDN URL appears in a <script> tag
          const escaped = rule.target?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || '';
          const scriptRegex = new RegExp(`<script[^>]*src=["'][^"']*${escaped}[^"']*["']`, 'i');
          passed = scriptRegex.test(html);
          break;
        }
        case 'canvas_exists': {
          passed = /<canvas[\s>]/i.test(html);
          break;
        }
        case 'element_exists': {
          // Rough check: look for a specific HTML pattern
          if (rule.selector) {
            const tagMatch = rule.selector.match(/^(\w+)/);
            if (tagMatch) {
              passed = new RegExp(`<${tagMatch[1]}[\\s>]`, 'i').test(html);
            }
          }
          break;
        }
        case 'state_field_exists': {
          // Look for useState with the target variable name
          if (rule.target) {
            const stateRegex = new RegExp(
              `(?:const\\s+\\[${rule.target}\\b|${rule.target}\\s*[=:]|${rule.target}\\.)`,
              'i'
            );
            passed = stateRegex.test(html);
          }
          break;
        }
      }

      results.push({
        skillId: skill.id,
        ruleType: rule.type,
        passed,
        message: passed ? '' : rule.message,
      });
    }
  }

  return results;
}
```

### Task 4.3: Integrate validation into commit flow

**Files:**
- Modify: `src/app/api/chat/commit/route.ts`

- [ ] **Add validation check before commit:**

```typescript
// After getting project with draft_html, before commit:
import { SKILLS } from '@/config/skills';
import { validateGeneratedHtml } from '@/lib/ai/validate';

// Get project's selected_skills
const { data: projectFull } = await db
  .from('projects')
  .select('*, selected_skills')
  .eq('id', projectId)
  .eq('user_id', userId)
  .single();

const activeSkills = (projectFull?.selected_skills || [])
  .map((id: string) => SKILLS[id])
  .filter(Boolean);

const validationResults = validateGeneratedHtml(project.draft_html, activeSkills);
const failures = validationResults.filter(r => !r.passed);

if (failures.length > 0) {
  return NextResponse.json({
    error: '技能验证未通过',
    validationFailures: failures.map(f => ({
      skillId: f.skillId,
      message: f.message,
    })),
  }, { status: 422 });
}

// Proceed with commit if validation passes
```

- [ ] **Update SkillSelector.tsx for categories and conflicts:**

Show skill category label, and when selecting a conflicting skill, warn the user.

```typescript
// After filtering availableSkills:
const groupedByCategory: Record<string, Skill[]> = {};
availableSkills.forEach(s => {
  if (!groupedByCategory[s.category]) groupedByCategory[s.category] = [];
  groupedByCategory[s.category].push(s);
});

// In JSX, render category groups:
{Object.entries(groupedByCategory).map(([category, skills]) => (
  <div key={category}>
    <p className="text-[10px] text-[var(--color-text-muted)] mb-1 uppercase">{category}</p>
    <div className="flex flex-wrap gap-1.5">
      {skills.map(skill => {
        const hasConflict = skill.conflicts.some(c => selectedSkills.includes(c));
        return (
          <button
            key={skill.id}
            onClick={() => {
              if (hasConflict) {
                const conflictNames = skill.conflicts
                  .map(c => SKILLS[c]?.name)
                  .filter(Boolean)
                  .join('、');
                if (!confirm(`该技能与「${conflictNames}」冲突，确定要切换吗？`)) return;
              }
              toggle(skill.id);
            }}
            aria-pressed={selectedSkills.includes(skill.id)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
            style={{
              background: selectedSkills.includes(skill.id) ? 'var(--color-accent)' : 'var(--color-surface-raised)',
              color: selectedSkills.includes(skill.id) ? '#fff' : 'var(--color-text-muted)',
              opacity: hasConflict && !selectedSkills.includes(skill.id) ? 0.5 : 1,
            }}
          >
            {skill.name}
          </button>
        );
      })}
    </div>
  </div>
))}
```

- [ ] **Commit Phase 4**

```bash
git add src/config/skills.ts src/lib/ai/validate.ts src/app/api/chat/commit/route.ts src/components/SkillSelector.tsx
git commit -m "feat: upgrade skills to SkillManifest with post-generation validation

Add validation rules, required scripts, data requirements, and conflict
detection to skill definitions. Create validation pipeline that checks
generated HTML before commit. Update SkillSelector with categories and
conflict warnings.

Phase 4 of contract-based template + AI orchestration layer."
```

---

## Phase 5: 设计增强 v2

### Task 5.1: Extend DesignProfile

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Add new fields to DesignProfile:**

```typescript
export interface DesignProfile {
  // ... existing fields ...
  scene: 'personal' | 'shared';
  theme: 'dark' | 'light';
  colorStrategy: 'restrained' | 'committed' | 'full-palette';
  accentColor: string;
  accentRatio: number;
  borderRadius: number;
  shadowStyle: 'none' | 'soft';
  motion: 'none' | 'subtle' | 'playful';
  fontFamily: string;
  bodyFontSize: number;
  lineHeight: number;
  density: 'sparse' | 'moderate';

  // NEW v2 fields
  styleLocked?: boolean;
  templateBound?: string;
  intentMode?: 'visual_only' | 'functional' | 'both';
}
```

### Task 5.2: Update mapper with design bounds check

**Files:**
- Modify: `src/config/design/mapper.ts`

- [ ] **Add design bounds validation:**

```typescript
import type { DesignBound } from '@/config/manifests/types';

export function validateProfileAgainstBounds(
  profile: DesignProfile,
  bounds?: DesignBound | null,
): string[] {
  if (!bounds) return [];

  const warnings: string[] = [];

  if (bounds.allowedThemes.length && !bounds.allowedThemes.includes(profile.theme)) {
    warnings.push(`主题模式 ${profile.theme} 不在模板允许范围内`);
  }
  if (bounds.allowedColorStrategies.length && !bounds.allowedColorStrategies.includes(profile.colorStrategy)) {
    warnings.push(`色彩策略 ${profile.colorStrategy} 不在模板允许范围内`);
  }
  if (profile.borderRadius < bounds.minBorderRadius || profile.borderRadius > bounds.maxBorderRadius) {
    warnings.push(`圆角 ${profile.borderRadius}px 超出模板允许范围 (${bounds.minBorderRadius}-${bounds.maxBorderRadius})`);
  }
  if (bounds.allowedMotion.length && !bounds.allowedMotion.includes(profile.motion)) {
    warnings.push(`动效 ${profile.motion} 不在模板允许范围内`);
  }

  return warnings;
}
```

### Task 5.3: Update prompt builder for design bounds

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **In `buildSystemPrompt`, inject design bounds + style lock + intent mode:**

```typescript
export function buildSystemPrompt(
  designProfile?: DesignProfile | null,
  templateId?: string,
): string {
  const base = `...`; // existing

  let extras = '';

  if (designProfile) {
    extras += '\n\n' + mapProfileToPromptText(designProfile);

    // Style lock
    if (designProfile.styleLocked) {
      extras += '\n\n【风格锁定】用户已锁定当前视觉风格。严禁修改整体配色方案、字体、圆角、间距和动效参数。只做功能层面的改动。';
    }

    // Intent mode
    if (designProfile.intentMode === 'visual_only') {
      extras += '\n\n【本次修改范围】仅限视觉调整，不新增功能、不改数据结构。';
    } else if (designProfile.intentMode === 'functional') {
      extras += '\n\n【本次修改范围】仅限功能改动，保持现有视觉风格不变。';
    }

    // Template bounds
    if (templateId) {
      const { getManifest } = require('@/config/manifests');
      const manifest = getManifest(templateId);
      if (manifest?.designBounds) {
        const bounds = manifest.designBounds;
        const boundsText = [
          bounds.allowedThemes.length ? `允许的主题: ${bounds.allowedThemes.join(', ')}` : '',
          bounds.allowedColorStrategies.length ? `允许的色彩策略: ${bounds.allowedColorStrategies.join(', ')}` : '',
          `圆角范围: ${bounds.minBorderRadius}-${bounds.maxBorderRadius}px`,
          bounds.allowedMotion.length ? `允许的动效: ${bounds.allowedMotion.join(', ')}` : '',
        ].filter(Boolean).join('\n');
        extras += `\n\n【模板设计边界】\n${boundsText}\n请勿超出上述边界。`;
      }
    }
  }

  return base + extras;
}
```

- [ ] **Commit Phase 5**

```bash
git add src/lib/db.ts src/config/design/mapper.ts src/lib/prompt.ts
git commit -m "feat: enhance DesignProfile with style lock, intent mode, and template bounds

Add styleLocked, intentMode, and templateBound fields. Implement design
bounds validation against TemplateManifest. Inject bounds and mode
instructions into AI system prompt.

Phase 5 of contract-based template + AI orchestration layer."
```

---

## Phase 6: 智能建议

### Task 6.1: Create suggestion engine

**Files:**
- Create: `src/lib/ai/suggestions.ts`

- [ ] **Create `src/lib/ai/suggestions.ts`:**

```typescript
import type { Suggestion } from '@/config/manifests/types';

interface SuggestionContext {
  manifestSuggestions: Suggestion[];
  activeSkills: string[];
  hasError: boolean;
  lastChangeType?: 'content' | 'skill' | 'design' | 'fix';
}

export function generateSuggestions(context: SuggestionContext): Suggestion[] {
  const result: Suggestion[] = [];

  // 1. Manifest suggestions (filtered by conditions)
  for (const s of context.manifestSuggestions) {
    if (s.condition?.type === 'skill_not_active') {
      if (context.activeSkills.includes(s.skillId || '')) continue;
    }
    if (s.condition?.type === 'no_error') {
      if (context.hasError) continue;
    }
    result.push(s);
  }

  // 2. Follow-up suggestions based on last change
  if (context.lastChangeType === 'skill') {
    result.push({
      text: '新功能用起来怎么样？需要调整位置或样式吗？',
      category: 'content',
    });
  } else if (context.lastChangeType === 'fix') {
    result.push({
      text: '修复完成，看看还有没有其他问题？',
      category: 'fix',
    });
  }

  // 3. General fallback (keep at most 6)
  return result.slice(0, 6);
}
```

### Task 6.2: Create SuggestionChips component

**Files:**
- Create: `src/components/SuggestionChips.tsx`

- [ ] **Create `src/components/SuggestionChips.tsx`:**

```typescript
'use client';
import type { Suggestion } from '@/config/manifests/types';

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
  loading?: boolean;
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  content: { bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)' },
  skill: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  design: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  fix: { bg: 'var(--color-danger-subtle)', color: 'var(--color-danger)' },
};

export default function SuggestionChips({ suggestions, onSelect, loading }: SuggestionChipsProps) {
  if (suggestions.length === 0 || loading) return null;

  return (
    <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => {
        const style = CATEGORY_STYLES[s.category] || CATEGORY_STYLES.content;
        return (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-80"
            style={{
              background: style.bg,
              color: style.color,
            }}
          >
            {s.text}
          </button>
        );
      })}
    </div>
  );
}
```

### Task 6.3: Integrate suggestions into ChatPanel

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Add suggestion state and rendering:**

```typescript
import { getManifest } from '@/config/manifests';
import { generateSuggestions } from '@/lib/ai/suggestions';
import SuggestionChips from './SuggestionChips';
import type { Suggestion } from '@/config/manifests/types';

// Add state:
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

// In component body, derive suggestions:
const manifest = templateId ? getManifest(templateId) : null;

useEffect(() => {
  if (manifest && !isLoading) {
    const ctx = {
      manifestSuggestions: manifest.defaultSuggestions,
      activeSkills: activeSkills,
      hasError: messages.some(m => m.status === 'error'),
    };
    setSuggestions(generateSuggestions(ctx));
  } else {
    setSuggestions([]);
  }
}, [manifest, activeSkills, messages, isLoading]);

// Handle suggestion click:
const handleSuggestionSelect = (text: string) => {
  setInput(text);
  textareaRef.current?.focus();
};

// In JSX, above the textarea:
<SuggestionChips
  suggestions={suggestions}
  onSelect={handleSuggestionSelect}
  loading={isLoading}
/>
```

- [ ] **Commit Phase 6**

```bash
git add src/lib/ai/suggestions.ts src/components/SuggestionChips.tsx src/components/ChatPanel.tsx
git commit -m "feat: add smart suggestion system with context-aware chips

Implement suggestion engine combining manifest defaults, skill state,
and error conditions. Add SuggestionChips component with category-
colorized chips that fill input on click.

Phase 6 of contract-based template + AI orcheration layer."
```
