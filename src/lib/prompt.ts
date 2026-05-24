// src/lib/prompt.ts
import type { Skill } from '@/config/skills';
import type { DesignProfile } from './db';
import { mapProfileToPromptText } from '@/config/design/mapper';
import { getManifest } from '@/config/manifests';

export function buildSystemPrompt(
  designProfile?: DesignProfile | null,
  templateId?: string,
): string {
  const base = `你是一个精通单文件 Web 应用的 React 专家。
当前应用通过 CDN 引入了 React（UMD 方式）和 Tailwind CSS。你的所有逻辑、状态、UI 必须写在同一个文件的 <script type="text/babel"> 块中。
数据必须使用 React.useState 维护，并通过 localStorage 持久化；所有 localStorage.getItem/setItem 必须包在 try/catch 中，避免沙箱或隐私模式下抛错导致白屏。

【铁律一：全量交付原则】
每次修改必须返回 100% 完整的 HTML 全量源码。严禁使用 "// 保持原有逻辑不变" 或 "/* 省略此处代码 */" 或 "此处代码不变" 等任何省略描述。

【铁律二：技术链锁定】
严禁引入需要 npm install 编译的现代 React 全家桶组件。所有外部库必须通过 <script src="CDN_URL"> 静态引入。
Tailwind CSS 通过 CDN 已加载，可直接使用其所有 class。
React 和 ReactDOM 通过 UMD 已加载，使用 React.useState, React.useEffect 等。
babel standalone 已加载，JSX 写在 <script type="text/babel"> 内。
Skill 指定的第三方库（Chart.js、SheetJS 等）通过 CDN 引入后挂载在 window 上，在 JSX 中直接用全局变量名（如 Chart、XLSX），不要用 import 或 require。

【铁律三：单文件数据孤岛】
所有全局状态锁在 React.useState 里，每次数据变更异步触发 localStorage.setItem(STORAGE_KEY, JSON.stringify(data))。
应用启动时从 localStorage 读取初始数据：const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } });
确保应用在 iframe 中拥有自完备的数据生命周期。

【铁律四：实现 Skill 前先读懂数据】
拿到当前源码后，第一步不是写代码，而是先确认：
1. state 变量名叫什么、是什么类型（数组/对象/基本类型）
2. 每条记录的字段名是什么（如 { amount, category, date, note }）
3. 新功能的数据从哪个 state 读取、写回哪里
Skill 要求"导出数据"时，你必须用实际的 state 字段名来映射列名，不能自己编造字段。

【输出格式】
只返回 \`\`\`html ... \`\`\` 包裹的完整代码，不要带有任何多余的 Markdown 解释。`;

  let result = base;

  if (designProfile) {
    result += '\n\n' + mapProfileToPromptText(designProfile);

    // Style lock: prevent AI from changing visual style
    if (designProfile.styleLocked) {
      result += '\n\n【风格锁定】用户已锁定当前视觉风格。严禁修改整体配色方案、字体、圆角、间距和动效参数。只做功能层面的改动。';
    }

    // Intent mode: restrict scope of changes
    if (designProfile.intentMode === 'visual_only') {
      result += '\n\n【本次修改范围】仅限视觉调整，不新增功能、不改数据结构。';
    } else if (designProfile.intentMode === 'functional') {
      result += '\n\n【本次修改范围】仅限功能改动，保持现有视觉风格不变。';
    }

    // Template design bounds
    if (templateId) {
      const manifest = getManifest(templateId);
      if (manifest?.designBounds) {
        const bounds = manifest.designBounds;
        const boundsLines: string[] = [];
        if (bounds.allowedThemes.length) {
          boundsLines.push(`允许的主题: ${bounds.allowedThemes.join(', ')}`);
        }
        if (bounds.allowedColorStrategies.length) {
          boundsLines.push(`允许的色彩策略: ${bounds.allowedColorStrategies.join(', ')}`);
        }
        boundsLines.push(`圆角范围: ${bounds.minBorderRadius}-${bounds.maxBorderRadius}px`);
        if (bounds.allowedMotion.length) {
          boundsLines.push(`允许的动效: ${bounds.allowedMotion.join(', ')}`);
        }
        result += `\n\n【模板设计边界】\n${boundsLines.join('\n')}\n请勿超出上述边界。`;
      }
    }
  }

  return result;
}

export function buildUserPrompt(
  currentHtml: string,
  userDemand: string,
  selectedSkills: string[],
  skillsMap: Record<string, Skill>,
  templateId?: string,
): string {
  const skillPrompts = selectedSkills
    .map(id => skillsMap[id]?.prompt)
    .filter(Boolean)
    .join('\n\n');

  const skillSection = skillPrompts
    ? `### 必须叠加的技能功能（最高优先级）：\n${skillPrompts}\n\n上述技能功能必须全部实现，不可遗漏。仔细阅读当前源码中的 state 字段名、数据结构和组件层级，确保新增功能与现有代码无缝集成。`
    : '';

  const manifest = templateId ? getManifest(templateId) : null;
  const slotSection = manifest?.editableSlots?.length
    ? `\n\n### 可改区域声明（请严格遵循）：\n${manifest.editableSlots.map(
        s => `- slot "${s.id}"（${s.label}）：${s.aiPrompt}`
      ).join('\n')}\n\n重要：请在上述每个 slot 对应的 HTML 元素上添加 data-vibecraft-slot 属性，属性值为 slot 的 id。不要遗漏。`
    : '';

  return `### 当前运行的完整 React CDN 源码：
${currentHtml}

${skillSection}${slotSection}

### 用户需求：
${userDemand}

请返回一份 100% 完整的 HTML，包含上述技能功能 + 用户需求的所有改动，可以直接保存为 .html 在浏览器中打开运行。`;
}

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
