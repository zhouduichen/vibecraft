// src/lib/prompt.ts
import type { Skill } from '@/config/skills';
import type { DesignProfile } from './db';
import { mapProfileToPromptText } from '@/config/design/mapper';

export function buildSystemPrompt(designProfile?: DesignProfile | null): string {
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

  if (designProfile) {
    return base + '\n\n' + mapProfileToPromptText(designProfile);
  }

  return base;
}

export function buildUserPrompt(
  currentHtml: string,
  userDemand: string,
  selectedSkills: string[],
  skillsMap: Record<string, Skill>
): string {
  const skillPrompts = selectedSkills
    .map(id => skillsMap[id]?.prompt)
    .filter(Boolean)
    .join('\n\n');

  const skillSection = skillPrompts
    ? `### 必须叠加的技能功能（最高优先级）：\n${skillPrompts}\n\n上述技能功能必须全部实现，不可遗漏。仔细阅读当前源码中的 state 字段名、数据结构和组件层级，确保新增功能与现有代码无缝集成。`
    : '';

  return `### 当前运行的完整 React CDN 源码：
${currentHtml}

${skillSection}

### 用户需求：
${userDemand}

请返回一份 100% 完整的 HTML，包含上述技能功能 + 用户需求的所有改动，可以直接保存为 .html 在浏览器中打开运行。`;
}
