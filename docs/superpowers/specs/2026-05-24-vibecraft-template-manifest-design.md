# VibeCraft 契约化模板 + AI 编排层设计

## 概述

将 VibeCraft 从"prompt 堆能力"升级为"契约化模板 + AI 编排层"。每个模板声明可改区域、数据结构和技能兼容性，AI 按契约修改，系统在生成后进行校验拦截。

## 核心概念

### TemplateManifest

每个模板从"一个 HTML 文件"升级为"HTML + Manifest"：

```typescript
interface TemplateManifest {
  id: string;
  isBlank?: boolean;
  editableSlots: EditableSlot[];
  dataSchema: DataField[];
  supportedSkills: string[];
  defaultSuggestions: Suggestion[];
  designBounds?: DesignBound;
}
```

#### EditableSlot

模板可改区域声明：

```typescript
interface EditableSlot {
  id: string;                      // 例如 "title", "subtitle", "theme-color"
  label: string;                   // 用户可见的标签，如 "页面标题"
  category: 'content' | 'style' | 'structure' | 'data';
  type: 'text' | 'color' | 'number' | 'select' | 'boolean' | 'block';
  defaultValue?: string;
  options?: { label: string; value: string }[];  // select 类型用
  bounds?: { min?: number; max?: number };        // 数值约束
  aiPrompt?: string;               // 注入给 AI 的 slot 描述
}
```

#### DataField

模板的数据结构声明：

```typescript
interface DataField {
  name: string;                    // state 字段名
  type: 'string' | 'number' | 'array' | 'object';
  label: string;
  description?: string;
  fields?: DataField[];            // 嵌套字段（array item / object）
}
```

#### Suggestion

默认建议：

```typescript
interface Suggestion {
  text: string;                    // 如 "加一个月度趋势图"
  skillId?: string;                // 关联的技能
  category: 'content' | 'skill' | 'design' | 'fix';
  condition?: {
    type: 'skill_not_active' | 'no_error';
  };
}
```

### SkillManifest v2

技能从纯 prompt 文本升级为带声明和校验的 manifest：

```typescript
interface SkillManifest {
  id: string;
  name: string;
  category: 'chart' | 'export' | 'alert' | 'optimize' | 'share';
  description: string;
  prompt: string;
  compatibleTemplates: string[];
  requiredScripts: { url: string; globalVar: string }[];  // CDN 依赖
  dataRequirements: string[];       // 需要的数据字段名
  conflicts: string[];              // 冲突技能 id
  validationRules: ValidationRule[];
}

interface ValidationRule {
  type: 'script_exists' | 'canvas_exists' | 'element_exists' | 'state_field_exists';
  selector?: string;                // CSS 选择器
  target?: string;                  // 检查目标
  message: string;                  // 失败提示
}
```

### DesignBound

模板级设计边界，防止 AI 跨度过大：

```typescript
interface DesignBound {
  allowedThemes: ('dark' | 'light')[];
  allowedColorStrategies: string[];
  minBorderRadius: number;
  maxBorderRadius: number;
  allowedMotion: string[];
}
```

## 架构变更

### 1. Template Manifest 底座（Phase 1）

**文件结构：**

```
src/
  config/
    manifests/
      ledger.ts          # ledeger 模板的 manifest
      todo.ts
      checkin.ts
      ...
    manifest-registry.ts  # 统一导出所有 manifest
```

Manifest 数据同时用于：
- **服务端**：创建项目时读取 editableSlots 和 dataSchema（当前用不上，但为未来预留）
- **客户端**：可改区域面板、suggestions、skill 兼容性展示
- **AI Prompt 构建**：将 slots 和 dataSchema 注入 system prompt

### 2. Draft-commit 管线（Phase 2，从原 Phase 5 提前）

**当前问题：** `chat/send/route.ts` 在 AI 流结束后直接保存 HTML 并扣积分，坏代码也会落地。

**改为 draft-commit 模型：**

```
用户发请求 → 检查余额（不扣）→ AI 生成 → 提取 HTML → 流式发给前端（draft）
前端 iframe 试运行 → 发回 ready / render_error → 前端调 commit / repair
```

**新增/修改文件：**

| 文件 | 变更 |
|---|---|
| `src/app/api/chat/send/route.ts` | 去掉 `chat_send_transaction` 调用，改为仅生成 draft，流式返回 code |
| `src/app/api/chat/commit/route.ts` | 新增：接收 draft_html，事务性保存 + 扣积分 + 创建 version |
| `src/app/api/chat/repair/route.ts` | 新增：接收错误信息 + 失败 HTML + 上一版 HTML + 用户需求，重新调用 AI 修复 |
| `src/components/ChatPanel.tsx` | 新增 draft 管理：收到 code 后等待 iframe 反馈，成功后调 commit |
| `src/components/PreviewPane.tsx` | 新增 `onReady` 回调 + postMessage 监听 `RENDER_READY` |
| DB | 新增 `projects.draft_html` 字段 |

**Repair 重试逻辑：**
- AI 生成 draft → iframe 试运行失败 → 调 repair（带上错误、失败 HTML、之前正常 HTML、用户需求）
- 最多重试 2 次 → 都失败则回滚到上一版（`current_html`），提示用户
- 积分只在成功 commit 时扣除

**积分安全：**
- `send` 阶段：检查 `credits >= 10`，不够直接拒绝（402）
- `commit` 阶段：重新检查余额（防并发耗尽），然后 `rpc` 原子：扣积分 + 写 `current_html` + 写 version
- `repair` 阶段：不额外扣积分（原请求已保留扣费资格，commit 时统一扣）

### 3. 可改区域 UI + Slot Bridge（Phase 3）

**Slot Bridge 协议：**

iframe → parent：
- `{ type: 'VIBECRAFT_READY' }` — iframe 加载完成
- `{ type: 'VIBECRAFT_SLOTS', slots: [{ id: 'title', rect: {x,y,w,h} }, ...] }` — 可改区域位置
- `{ type: 'VIBECRAFT_SLOT_CLICK', slotId: 'title' }` — 用户点击了某个区域

parent → iframe：
- `{ type: 'HIGHLIGHT_SLOT', slotId: 'title' }` — 高亮某个区域

**AI Prompt 注入：**
在 `buildUserPrompt` 中，为支持 manifest 的模板注入 slot 声明：

```
【可改区域声明】
- slot "title"（页面标题）：请在标题元素上加 data-vibecraft-slot="title"
- slot "subtitle"（副标题）：请在副标题元素上加 data-vibecraft-slot="subtitle"
- slot "theme-color"（主题色）：应用于主色调元素
```

**可改内容面板：**
- 位置：ChatPanel 下方或右侧辅助面板
- 分四组：内容、样式、功能、结构
- 每种 slot 类型渲染对应控件（text input、color picker、toggle）
- 简单字段（改标题、改主题色）走直接修改 HTML，不调 AI
- 复杂操作（加区块、换布局）调 AI，带 intent 描述

### 4. 技能系统 v2（Phase 4）

**后处理校验管线** `src/lib/ai/validate.ts`：

```typescript
function validateGeneratedHtml(html: string, skills: SkillManifest[]): ValidationResult[]
```

检查项：
- `script_exists`：grep `<script src="...">` 检查 CDN 是否引入
- `canvas_exists`：检查 `<canvas>` 元素存在
- `state_field_exists`：在 `<script type="text/babel">` 中搜索指定 useState 变量名
- `element_exists`：根据 CSS 选择器检查元素

校验在以下时机触发：
- AI 流式响应完成、HTML 提取后（`chat/send/route.ts`）
- 如果校验失败，向后端返回 warning（非阻塞）
- 失败信息展示在可改区域面板中，用户可见

**Skill 冲突处理：**
- `SkillManifest.conflicts` 声明冲突列表
- UI 层 `SkillSelector.tsx` 在选择时检查冲突，提示"此技能与 X 冲突"
- 后端 `commit` 时再次校验冲突

**技能分类和分层展示：**
- 推荐技能（模板 `supportedSkills` 匹配）
- 可用技能（兼容但非推荐）
- 暂不可用（缺少数据字段）

### 5. 设计增强 v2（Phase 5）

**扩展 DesignProfile：**

```typescript
interface DesignProfile {
  // ... 现有字段保持不变 ...
  styleLocked?: boolean;           // 风格锁定，锁定后 AI 不轻易修改整体风格
  templateBound?: string;          // 绑定的模板 ID，用于越界检查
  intentMode?: 'visual_only' | 'functional' | 'both';  // 本次修改意图
}
```

**Change Plan 越界检查：**
- 生成前，AI 产出一个短 change plan（在 user prompt 里要求第一段输出 plan）
- 系统检查 plan 是否在 designBounds 内
- 越界则提示用户确认

**Prompt 构建改造**（`buildSystemPrompt` + `buildUserPrompt`）：
- 注入模板 designBounds
- 如果 `styleLocked`，注入"禁止修改当前视觉风格"
- 根据 `intentMode` 调整 prompt 指令权重

### 6. 智能建议（Phase 6）

**建议来源（优先级从高到低）：**
1. 模板 manifest 的 `defaultSuggestions`（静态、零成本）
2. 当前已启用技能的互补建议（如已有 chart，建议 export_excel）
3. 当前设计 profile 的建议（如 density='sparse' 但内容很多，建议调为 moderate）
4. 最近修改的逆向建议（刚加了图表，建议"把图表调得更美观"）
5. 预览错误时的修复建议

**实现位置：** `ChatPanel.tsx` 输入框上方 chip 行。

**交互：** 点击 chip 填入输入框（不直接执行），用户可以修改后再发送。

## 执行计划

### Phase 1：Template Manifest 底座（预计 1-2 天）

1. 定义 `TemplateManifest`, `EditableSlot`, `DataField`, `Suggestion` 类型 → `src/config/manifests/types.ts`
2. 为 `ledger` 模板编写完整 manifest → `src/config/manifests/ledger.ts`
  - 至少 10 个 editable slots（标题、副标题、主题色、圆角、收支列表、分类、统计摘要、导出按钮、图表区、布局密度）
  - dataSchema 匹配 ledger 模板的实际 state 结构
  - 3-5 个 defaultSuggestions
  - 可选的 designBounds
3. 创建 `src/config/manifests/manifest-registry.ts` 统一导出
4. 在 `buildUserPrompt` 中注入 manifest 的 slot 声明（让 AI 生成时加 data 属性）
5. 更新 `TemplateMeta` 或 `TEMPLATE_CATALOG` 关联 manifest

### Phase 2：Draft-commit 管线（预计 1-2 天）

1. DB migration：`ALTER TABLE projects ADD COLUMN draft_html text`
2. 重构 `chat/send/route.ts`：移除 `chat_send_transaction`，流式返回 code，不保存
3. 新增 `POST /api/chat/commit/route.ts`：接收 `projectId`，事务扣积分 + 写 current_html + 创建 version
4. 新增 `POST /api/chat/repair/route.ts`：带错误信息重试
5. `PreviewPane.tsx`：新增 `RENDER_READY` 消息处理 + `onReady` 回调
6. `ChatPanel.tsx`：管理 draft 状态，预览成功后调 commit，失败后调 repair
7. 积分检查：send 阶段只读检查，commit 阶段原子扣减

### Phase 3：可改区域 UI + Bridge（预计 1 天）

1. Bridge 协议实现（iframe postMessage 双向通信）
2. AI prompt 注入 slot 声明
3. 可改内容面板组件（分组展示 slots、确定修改模式、直接修改或调 AI）
4. Slot 高亮交互

### Phase 4：技能系统 v2（预计 1-2 天）

1. 定义 `SkillManifest`, `ValidationRule` 类型
2. 为 chart、export_excel、budget_alert 编写 manifest
3. 实现后处理校验管线 `validate.ts`
4. 改造 `SkillSelector.tsx` 展示技能分类和冲突提示
5. 集成到 draft-commit 流程（commit 前跑校验）

### Phase 5：设计增强 v2（预计 1 天）

1. 扩展 `DesignProfile` 加 styleLocked、intentMode
2. 实现 designBounds 检查
3. 改造 prompt 构建逻辑
4. Change Plan 越界检测

### Phase 6：智能建议（预计 1 天）

1. Suggestion engine（多来源合并、去重、排序）
2. 建议 chip 组件
3. 点击填入输入框交互

## 验收标准

- `ledger` 模板可见 10+ 可改点
- 5 类修改不需复杂 prompt（标题、主题色、字号、列表排序、技能开关）
- 技能添加成功 > 当前（估计 80%+，当前约 50-60%）
- 生成白屏后不会把坏版本直接变成最终版本
- 每次修改后有下一步建议
- 积分只有代码验证通过后才扣除

## 不包含的范围（明确 cut）

- 不在 Phase 1 做全量模板 manifest，只做 ledger 试点
- 不做可视化拖拽编辑器
- 不做代码 diff 视图
- 不做 iframe allow-same-origin 绕过
- 不在 Phase 2 前做任何 AI 能力增强
