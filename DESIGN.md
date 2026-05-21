---
name: VibeCraft
description: 用自然语言创造应用。克制、有质感、有惊喜的手工纸品美学。
colors:
  warm-slate-base: "#0a0b10"
  warm-slate-surface: "#13151f"
  warm-slate-raised: "#1a1d2b"
  pencil-blue: "#6c72f0"
  pencil-blue-hover: "#8187f5"
  pencil-blue-subtle: "rgba(108, 114, 240, 0.12)"
  border-subtle: "#232738"
  border-hover: "#2f3454"
  ink-primary: "#e8e9f0"
  ink-secondary: "#9498b0"
  ink-muted: "#787d94"
  success-green: "#34c77b"
  warning-amber: "#f5a623"
  danger-red: "#f44b6b"
  danger-red-subtle: "rgba(244, 75, 107, 0.12)"
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "-0.01em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.pencil-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.pencil-blue-hover}"
  card-surface:
    backgroundColor: "{colors.warm-slate-surface}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  input-field:
    backgroundColor: "{colors.warm-slate-base}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  nav-item:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-item-hover:
    textColor: "{colors.ink-primary}"
    backgroundColor: "{colors.warm-slate-raised}"
---

# Design System: VibeCraft

## 1. Overview

**Creative North Star: "手工纸品"**

像一本精心排印的独立杂志：深色纸张上的铅笔画痕，克制的留白，指尖能感受到的纹理。这不是一个冷冰冰的工具界面，而是一个让人想坐下来慢慢翻的手作空间。

底色是夜里台灯照在石板灰纸上的色调，不纯黑，带一点点暖意。铅笔蓝是唯一的强调色，像在用 6H 铅笔在纸上轻轻画出标记，克制但精准。意外感来自翻页时的小细节：一个微妙的扩散光晕、一行恰到好处的留白、一个让人会心一笑的动效。

质感通过减法获得。没有多余的分割线、没有大面积的卡片嵌套、没有喧哗的渐变。纸纹纹理铺满整个表面（3% 透明度 noise 层），不仔细看看不到，但少了它就感觉不对。

这排斥 SaaS 模板的塑料感、AI 套壳的廉价紫粉渐变、以及技术工具的冷酷单色。它是温暖的、有人味的，像一个懂你的创意伙伴坐在旁边。

**Key Characteristics:**
- 深色纸底 + 石板暖灰基调：暗但不冷
- 铅笔蓝单色强调，使用克制约占任一界面 ≤10%
- 纯色分层表达深度，关键状态才加扩散光晕
- 系统原生无衬线字体，靠字重和大小建立层级
- 拒绝卡片嵌套、侧边条纹、渐变文字、玻璃效果

## 2. Colors

石板暖灰家族和铅笔蓝构成整个调色板。暖灰负责空间感，铅笔蓝负责注意力指向。

### Primary
- **铅笔蓝 Pencil Blue** (#6c72f0 / oklch(60% 0.21 275)): 唯一的强调色。用于主按钮背景、选中态、焦点环、链接。出现频率不超过任何界面面积的 10%。它的力量来自稀有。
- **铅笔蓝悬停 Pencil Blue Hover** (#8187f5): 仅在 hover 和 active 状态使用。
- **铅笔蓝淡层 Pencil Blue Subtle** (rgba(108, 114, 240, 0.12)): 选中的标签、按下的 toggle、微妙的高亮背景。

### Neutral
- **石板底 Warm Slate Base** (#0a0b10): 页面底色。不纯黑，微微偏向蓝灰，像被台灯照了一夜的纸底。
- **石板面 Warm Slate Surface** (#13151f): 卡片、面板、导航条的背景色。比底色高一层。
- **石板浮层 Warm Slate Raised** (#1a1d2b): hover 时的升高表面。和 Surface 的对比度刚好能被感知到，不跳跃。
- **纸纹 Border Subtle** (#232738): 默认边框色。存在但不抢眼，像铅笔画出的淡线。
- **纸纹悬停 Border Hover** (#2f3454): hover 时边框加深。引导视线，不制造紧张。
- **墨色主 Ink Primary** (#e8e9f0): 正文、标题、主要信息。在深色底上清晰但不刺眼。
- **墨色次 Ink Secondary** (#9498b0): 辅助说明、导航标签、次要文案。
- **墨色弱 Ink Muted** (#787d94): 占位符、禁用态、最不重要的信息。

### Semantic
- **成功绿 Success Green** (#34c77b): 完成、成功、已保存。
- **警告琥珀 Warning Amber** (#f5a623): 需注意但不紧急的状态。
- **危险红 Danger Red** (#f44b6b): 删除、错误、不可逆操作。
- **危险红淡层 Danger Red Subtle** (rgba(244, 75, 107, 0.12)): 错误状态的背景层。

### Named Rules
**The 10% Rule.** 铅笔蓝出现在任何界面的面积不超过 10%。如果一张屏幕上同时有三个以上的蓝色元素，说明强调色用滥了。

**The Ink Rule.** 文字颜色只用三种墨色。不新造灰色，不用纯白。primary / secondary / muted 三级足够覆盖所有信息层级。

## 3. Typography

**Body Font:** 系统原生无衬线栈 (-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif)

**Character:** 安静、中性、不抢戏。字体本身不做个性声明，让排版的空间感和节奏感说话。中文和西文共用同一栈，依赖系统各自最优的 fallback。

### Hierarchy
- **Display** (bold 700, 2rem / 32px, line-height 1.2): 首页标题。仅在模板市场顶部使用。
- **Headline** (semibold 600, 1.25rem / 20px, line-height 1.3): 页面主标题。仪表盘、项目编辑器。
- **Title** (medium 500, 14px, line-height 1.4): 卡片标题、列表项名称。
- **Body** (regular 400, 14px, line-height 1.6, max 70ch): 正文、描述、长文本。
- **Label** (medium 500, 13px, letter-spacing -0.01em): 按钮、导航标签、分类、表单标签。略紧的字间距让标签更紧凑。
- **Caption** (regular 400, 12px, line-height 1.5): 时间戳、辅助信息、错误提示。

### Named Rules
**The Single Stack Rule.** 全站只用一套无衬线字体栈。不混用 serif、不加载 web font。字体不是 VibeCraft 做个性声明的地方；空间、颜色、动效才是。

**The Scale Gap Rule.** 相邻层级字号比 ≥ 1.25。不做"差不多大"的字号阶梯。

## 4. Elevation

深色纸品的深度不靠阴影，靠色调的逐层提亮。底色 → 表面 → 浮层，三层色阶刚好让眼睛分辨层级，不跳跃。

阴影是克制的特例。只在关键交互状态出现：hover 时一个极淡的扩散光晕（`0 0 20px rgba(108, 114, 240, 0.08)`），像铅笔蓝在纸下微微透光。不是功能性的投影，是装饰性的呼吸。

### Shadow Vocabulary
- **pencil-glow** (`box-shadow: 0 0 20px rgba(108, 114, 240, 0.08)`): 仅在元素 hover 或 focus 时使用。仅对铅笔蓝相关的交互元素。不用于卡片、不用于静态状态。

### Named Rules
**The Flat-By-Default Rule.** 所有表面在静止状态下都是平的。纸已经够好了，不需要假三维。阴影只在状态变化时作为温柔的反馈出现，不是作为结构的指示。

**The Glow-Is-Rare Rule.** 扩散光晕只用在 pencil-glow 规定的场景。禁止在卡片、导航、非交互表面使用任何形式的 shadow。

## 5. Components

### Buttons
一个主按钮变量，在明确定义的场景中承担所有主要操作。

- **Shape:** 圆角 12px (rounded.md)，与卡片和输入框一致的圆角语言。
- **Primary:** 铅笔蓝底 + 白色文字，水平 padding 16px，垂直 8px。字体 13px medium。
- **Hover:** 铅笔蓝悬停色 (#8187f5)，`transition: background-color 180ms ease-out`。
- **Focus:** 2px 铅笔蓝 outline，offset 2px，border-radius 继承按钮自身。
- **Disabled:** 换成石板浮层底色 + 墨色弱文字。cursor: not-allowed。
- **Ghost variant:** 无背景，墨色次文字。hover 时底色变石板浮层 + 文字变墨色主。

按钮文案用中文，不加 emoji。一个词或两个词："发送"、"新建项目"、"浏览模板"。

### Cards / Containers
模板卡片是主要容器组件。

- **Corner Style:** 圆角 16px (rounded-lg)。
- **Background:** 石板面 (#13151f)。
- **Border:** 纸纹 Subtle (#232738) 1px solid。
- **Hover:** border 变为纸纹悬停 (#2f3454)，加 pencil-glow。
- **Internal Padding:** 不均匀（头图无 padding，内容区 14px 16px）。
- **No nested cards.** 卡片内部不套卡片。如果要分组，用留白。

### Inputs / Fields
搜索框和对话输入框共用同一套样式。

- **Style:** 石板底色 + 纸纹 Subtle 边框，圆角 12px (rounded.md)。
- **Padding:** 垂直 10px，水平 14px。
- **Placeholder:** 墨色弱 (#787d94)，13px。
- **Focus:** 边框变铅笔蓝，加 2px 铅笔蓝 outline（offset 2px）。`transition: border-color 180ms ease-out`。
- **Error:** 边框变危险红，下方出现 12px 危险红 error text。
- **Disabled:** opacity 50%，cursor not-allowed。
- **Textarea:** 同上，但 resize: none，rows=2。

### Navigation
顶部导航条 + 次级标签。

- **Top Nav:** 高度 44px，石板面底色，底部 border 1px 纸纹 Subtle。Logo 14px semibold + 导航链接 13px medium。hover 时文字从墨色次变为墨色主，背景变石板浮层。
- **Tab/Category Pills:** 圆角 8px (rounded.sm)，padding 4px 16px，13px medium。未选中：墨色次，hover 变墨色主 + 石板浮层背景。选中：铅笔蓝底 + 白色文字。

### Chat Panel
对话面板是左侧 320-360px 固定宽度区域。

- **Header:** 44px，底部 1px 纸纹 Subtle 分割，标题 13px medium 墨色次。
- **Message Area:** 石板底圆角 12px 容器，内部 pre 标签 12px monospace 墨色次。
- **Streaming Indicator:** 三个 6px 铅笔蓝圆点，依次弹跳动画。旁注 12px 墨色弱文字"AI 正在修改..."。
- **Input Area:** 顶部 1px 纸纹 Subtle 分割，padding 12px。textarea 和 发送按钮并排。

### Named Rules
**The Card-Surface Rule.** 任何容器要么是石板面 + 边框（卡片），要么是石板底（嵌入区），不允许第三个样式。不要发明新的容器颜色组合。

## 6. Do's and Don'ts

### Do:
- **Do** 用留白和字号对比代替分割线和边框。三行内容之间的空隙比一条 border 更好。
- **Do** 铅笔蓝仅用于可交互元素和焦点环。永远不用于纯装饰。
- **Do** 保持按钮文案简短（2-4 个中文字）。"发送"、"新建项目"、"浏览模板"。
- **Do** 用三层墨色（primary / secondary / muted）覆盖所有文字层级。不新造灰色。
- **Do** 圆角在同一组件类型内保持一致。所有按钮 12px，所有卡片 16px，所有 pill 8px。
- **Do** hover 必须有反馈（颜色变化或微光晕），且过渡时间 180ms ease-out。
- **Do** 保留纸纹纹理。它在 body::before 里，3% opacity，关掉它界面就失去了手工感。

### Don't:
- **Don't** 使用大厂 SaaS 模板审美：白底、蓝按钮、Inter 字体、密集表格、渐变 hero section。
- **Don't** 使用 AI 套壳审美：紫粉渐变、魔法 sparkle emoji、"一键生成"、"AI 赋能"之类的话术。
- **Don't** 使用冷酷技术风：终端配色、荧光绿、等宽字体全文排版、完全没人味。
- **Don't** 在卡片左侧或右侧使用大于 1px 的彩色侧边条纹。
- **Don't** 在文字上使用 background-clip: text 渐变效果。
- **Don't** 用玻璃拟态（backdrop-filter blur）作为默认卡片样式。极罕见场景可以讨论，但从不是默认选项。
- **Don't** 使用大数字 + 小标签 + 辅助统计的 hero-metric 模板。
- **Don't** 使用完全相同尺寸的图标 + 标题 + 正文卡片网格。
- **Don't** 把 modal 作为解决布局问题的首选。先用行内展开、渐进披露。
- **Don't** 动画化 CSS layout 属性（width、height、top、left）。
- **Don't** 使用弹跳或弹性缓动曲线。只用 ease-out-quart / ease-out-expo。
