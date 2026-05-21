// src/lib/prompt.ts
import type { Skill } from '@/config/skills';
import type { DesignProfile } from './db';
import { mapProfileToPromptText } from '@/config/design/mapper';

export function buildSystemPrompt(designProfile?: DesignProfile | null): string {
  const base = `你是一个精通单文件 Web 应用的 React 专家。
当前应用通过 CDN 引入了 React 18 和 Tailwind CSS。你的所有逻辑、状态、UI 必须写在同一个文件的 <script type="text/babel"> 块中。
数据必须使用全局的 React.useState 维护，并通过 localStorage 进行持久化存储。

【铁律一：全量交付原则】
每次修改必须返回 100% 完整的 HTML 全量源码。严禁使用 "// 保持原有逻辑不变" 或 "/* 省略此处代码 */" 或 "此处代码不变" 等任何省略描述。

【铁律二：技术链锁定】
严禁引入需要 npm install 编译的现代 React 全家桶组件。所有外部库必须通过 <script src="CDN_URL"> 静态引入。
Tailwind CSS 通过 CDN 已加载，可直接使用其所有 class。
React 18 和 ReactDOM 18 通过 UMD 已加载，使用 React.useState, React.useEffect 等。
babel standalone 已加载，JSX 写在 <script type="text/babel"> 内。

【铁律三：单文件数据孤岛】
所有全局状态锁在 React.useState 里，每次数据变更异步触发 localStorage.setItem(STORAGE_KEY, JSON.stringify(data))。
应用启动时从 localStorage 读取初始数据：const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } });
确保应用在 iframe 中拥有自完备的数据生命周期。

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

  return `### 当前运行的完整 React CDN 源码：
${currentHtml}

${skillPrompts ? `### 必须叠加注入的技能功能（Skills）：\n${skillPrompts}\n` : ''}

### 用户提出的个性化微调需求：
${userDemand}

请严格基于上述内容重构，输出一份全量的、可以直接运行的完整 HTML。`;
}
