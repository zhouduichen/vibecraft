# Complete App Export 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将导出从"下载 HTML 文件"升级为"发布完整应用"——ZIP 包含 PWA 文件结构（manifest、sw.js、图标、安装指引），菜单改名为"发布应用"，增加 APK 入口。

**Architecture:** 服务端 zip/route.ts 生成完整 ZIP 包（子文件夹 + sw.js + SVG 图标 + README + 安装指引），客户端 ExportMenu.tsx 重构为"发布应用"菜单（下载/分享/APK 三入口 + 发布成功卡片）。

**Tech Stack:** JSZip（服务端）、Node.js `fs` 无关（纯内存操作）、React/TypeScript 客户端

---

## File Structure

| 文件 | 职责 | 改动类型 |
|------|------|----------|
| `src/app/api/export/zip/route.ts` | 生成完整 PWA ZIP 包 | 大幅修改 |
| `src/components/ExportMenu.tsx` | "发布应用"菜单 + 成功卡片 | 大幅修改 |
| `src/app/project/[id]/page.tsx` | 调用 ExportMenu 的地方 | 无改动 |

---

### Task 1: 重写 ZIP 导出 —— 完整 PWA 包

**Files:**
- Modify: `src/app/api/export/zip/route.ts`

将 ZIP 从散落文件升级为以项目名命名的子文件夹，包含完整 PWA 文件集。

- [ ] **Step 1: 新增 manifest 解析与改写工具函数**

在 route.ts 顶部添加辅助函数，不改动已有逻辑：

```typescript
// 从 HTML 中提取内联 manifest JSON
function extractManifest(html: string): Record<string, unknown> | null {
  const m = html.match(/href="data:application\/json,([^"]+)"/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}

// 从 manifest 中提取 emoji（如 💰），fallback 📱
function extractEmoji(manifest: Record<string, unknown> | null, html: string): string {
  // 尝试从 manifest 的 icons 中取 src=data:image/svg+xml,... 里的 emoji
  if (manifest) {
    const icons = (manifest as any).icons;
    if (Array.isArray(icons) && icons[0]?.src) {
      const srcMatch = String(icons[0].src).match(/%3Ctext[^%]*%3E(.*?)%3C\/text/);
      if (srcMatch) {
        try { return decodeURIComponent(srcMatch[1]); } catch { return '📱'; }
      }
      // Try raw emoji in src
      const emojiMatch = String(icons[0].src).match(/([\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}])/u);
      if (emojiMatch) return emojiMatch[0];
    }
  }
  // Fallback: scan HTML for emoji in <title>
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/);
  if (titleM) {
    const titleEmoji = titleM[1].match(/([\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F5FF}])/u);
    if (titleEmoji) return titleEmoji[0];
  }
  return '📱';
}

// 从 HTML 中提取所有 CDN script src
function extractCdnUrls(html: string): string[] {
  return [...html.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
}

// 生成 SVG 图标文件内容
function makeSvgIcon(emoji: string, size: number, bgColor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect fill="${bgColor}" width="${size}" height="${size}" rx="${Math.round(size * 0.17)}"/>
  <text x="${size / 2}" y="${Math.round(size * 0.7)}" text-anchor="middle" font-size="${Math.round(size * 0.5)}">${emoji}</text>
</svg>`;
}

// 生成 sw.js 内容
function makeServiceWorker(cdnUrls: string[]): string {
  const urlsJson = JSON.stringify(cdnUrls, null, 2);
  return `const CACHE_NAME = 'vibecraft-v1';
const URLS = ['./index.html', ${cdnUrls.map(u => JSON.stringify(u)).join(', ')}];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});`;
}

// 重写 manifest，将图标字段替换为实际文件路径
function rewriteManifest(manifest: Record<string, unknown>): string {
  const m = JSON.parse(JSON.stringify(manifest)); // deep copy
  m.icons = [
    { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
  ];
  return JSON.stringify(m, null, 2);
}
```

- [ ] **Step 2: 替换 ZIP 构建逻辑**

删除旧的 `zip.file('index.html', ...)` 等调用，替换为新的子文件夹结构。完整替换从 `// Extract PWA manifest` 行开始到 `zip.generateAsync` 之前的部分：

```typescript
  // ── Extract metadata ──
  const manifest = extractManifest(project.current_html);
  const emoji = extractEmoji(manifest, project.current_html);
  const themeColor = (manifest as any)?.theme_color || '#6366f1';
  const bgColor = (manifest as any)?.background_color || '#0f172a';
  const cdnUrls = extractCdnUrls(project.current_html);
  const folder = project.name.replace(/[<>:"/\\|?*]/g, '_'); // sanitize path

  // ── Generate assets ──
  const manifestJson = manifest ? rewriteManifest(manifest) : null;
  const swJs = makeServiceWorker(cdnUrls);
  const icon192 = makeSvgIcon(emoji, 192, themeColor);
  const icon512 = makeSvgIcon(emoji, 512, themeColor);

  // ── README.md ──
  const readme = [
    `# ${project.name}`,
    '',
    '你的应用已构建完成。',
    '',
    '## 包含文件',
    '',
    `- \`index.html\` — 应用主文件（双击即可打开使用）`,
    `- \`sw.js\` — 离线运行支持（断网也能打开）`,
    ...(manifestJson ? ['- `manifest.json` — PWA 应用配置'] : []),
    `- \`icons/\` — 应用图标`,
    `- \`README.md\` — 本说明文件`,
    `- \`安装到桌面.txt\` — 各平台安装指引`,
    '',
    '## 安装到桌面（Windows / Mac）',
    '',
    '1. 用 Chrome 或 Edge 浏览器打开 `index.html`',
    '2. 点击地址栏右侧的安装图标',
    '3. 应用以独立窗口运行，像普通软件一样',
    '',
    '## 安装到手机',
    '',
    '查看 `安装到桌面.txt` 了解各平台详细步骤。',
    '',
    `> 由 VibeCraft 生成 — ${new Date().toLocaleDateString('zh-CN')}`,
  ].join('\n');

  // ── 安装到桌面.txt ──
  const installGuide = [
    '=== 安装到桌面 ===',
    '',
    '【Windows / Mac】',
    '1. 用 Chrome 或 Edge 浏览器打开 index.html',
    '2. 地址栏右侧出现安装图标 → 点击"安装"',
    '3. 桌面出现独立窗口，开始菜单搜索即可打开',
    '',
    '【Android 手机】',
    '1. 用 Chrome 浏览器打开 index.html',
    '2. 底部弹出"添加到主屏幕"',
    '3. 主屏幕出现应用图标，点击即可全屏使用',
    '',
    '【iPhone】',
    '1. 用 Safari 浏览器打开 index.html',
    '2. 点击底部分享按钮 → "添加到主屏幕"',
    '3. 桌面出现应用图标，点击即可全屏使用',
    '',
    '=== 生成 APK 安装包（Android） ===',
    '',
    '1. 用 Chrome 访问 https://pwabuilder.com',
    '2. 点击"开始" → 上传此 ZIP 文件',
    '3. 按提示生成 APK，下载后安装到手机',
  ].join('\n');

  // ── Build ZIP with subfolder ──
  const zip = new JSZip();
  const root = zip.folder(folder)!;
  root.file('index.html', project.current_html);
  root.file('sw.js', swJs);
  root.file('README.md', readme);
  root.file('安装到桌面.txt', installGuide);
  if (manifestJson) {
    root.file('manifest.json', manifestJson);
  }
  const icons = root.folder('icons')!;
  icons.file('icon-192.svg', icon192);
  icons.file('icon-512.svg', icon512);

  const content = await zip.generateAsync({ type: 'uint8array' });
```

- [ ] **Step 3: 重启服务器并验证**

```bash
taskkill //F //IM "node.exe" 2>/dev/null; sleep 2
export PATH="/c/Program Files/nodejs:$PATH"
cd D:/creator/vibecraft && npm run dev -- --port 3008 &
sleep 8
```

在浏览器中进入一个项目 → 点击"导出" → "下载 ZIP 文件" → 解压验证：
- 文件夹名 = 项目名
- 包含 index.html、sw.js、manifest.json、README.md、安装到桌面.txt
- `icons/` 文件夹含 icon-192.svg 和 icon-512.svg

- [ ] **Step 4: 提交**

```bash
cd D:/creator/vibecraft
git add src/app/api/export/zip/route.ts
git commit -m "feat: complete PWA ZIP export — subfolder structure, sw.js, SVG icons, install guide"
```

---

### Task 2: 重构导出菜单为"发布应用"

**Files:**
- Modify: `src/components/ExportMenu.tsx`

- [ ] **Step 1: 重写 ExportMenu 组件**

用以下完整代码替换 `src/components/ExportMenu.tsx`：

```tsx
'use client';
import { useState, useRef, useEffect } from 'react';

interface ExportMenuProps {
  projectId: string;
}

export default function ExportMenu({ projectId }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleZip = async () => {
    setLoading('zip');
    const res = await fetch('/api/export/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) { setLoading(null); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.zip';
    a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
    setOpen(false);
  };

  const handlePublish = async () => {
    setLoading('publish');
    const res = await fetch('/api/export/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (data.url) {
      setPublishUrl(data.url);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.url)}`);
      setPublished(true);
    }
    setLoading(null);
  };

  const handleApk = () => {
    window.open('https://pwabuilder.com', '_blank');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publishUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setPublished(false); }}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
      >
        发布应用
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-xl z-50 p-4"
          role="menu"
        >
          {/* ── 发布成功卡片 ── */}
          {published && publishUrl ? (
            <div>
              <div className="text-center mb-3">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  发布成功！
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                  应用已上线，可通过以下方式分享
                </p>
              </div>

              <div className="text-center p-3 bg-[var(--color-base)] rounded-[var(--radius-lg)] mb-3">
                <img src={qrUrl} alt="分享二维码" className="w-32 h-32 mx-auto mb-3 rounded-lg" />
                <div className="flex gap-1.5 mb-3">
                  <label htmlFor="publish-url-input" className="sr-only">分享链接</label>
                  <input
                    id="publish-url-input"
                    readOnly
                    value={publishUrl}
                    className="flex-1 text-[11px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2.5 py-1.5 rounded-[var(--radius-sm)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={copyUrl}
                    className="text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] text-center mb-3">或</p>

              <button
                onClick={handleZip}
                disabled={loading === 'zip'}
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">下载完整应用包</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  下载后可在桌面和手机安装使用
                </p>
              </button>
            </div>
          ) : (
            /* ── 未发布：三入口菜单 ── */
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
                发布应用
              </h3>

              <button
                onClick={handleZip}
                disabled={loading === 'zip'}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">下载到电脑</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  打包为完整应用，解压后即可安装到桌面
                </p>
              </button>

              <button
                onClick={handlePublish}
                disabled={loading === 'publish'}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">生成分享链接</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  发布到线上，链接和二维码即可分享
                </p>
              </button>

              <button
                onClick={handleApk}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">生成 APK 安装包</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  跳转 PWABuilder，上传 ZIP 后下载 APK
                </p>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 重启服务器并验证 UI**

```bash
taskkill //F //IM "node.exe" 2>/dev/null; sleep 2
export PATH="/c/Program Files/nodejs:$PATH"
cd D:/creator/vibecraft && npm run dev -- --port 3008 &
sleep 8
```

浏览器验证：
1. 进入项目 → 按钮显示"发布应用"（不再显示"导出"）
2. 点击 → 下拉菜单有三个入口：下载到电脑 / 生成分享链接 / 生成 APK
3. 点击"生成分享链接" → 显示发布成功卡片（标题"发布成功！" + QR + URL + 复制 + 下载完整应用包）
4. 点击"生成 APK" → 新标签页打开 pwabuilder.com

- [ ] **Step 3: 提交**

```bash
cd D:/creator/vibecraft
git add src/components/ExportMenu.tsx
git commit -m "feat: redesign export menu as '发布应用' with publish success card and APK entry"
```

---

## Verification Checklist

全部完成后验证：

1. `npm run dev` → 进入项目
2. 点击"发布应用" → "下载到电脑" → 解压 ZIP：
   - [ ] 文件夹名 = 项目名
   - [ ] 含 index.html / sw.js / manifest.json / README.md / 安装到桌面.txt / icons/
   - [ ] icon-192.svg 和 icon-512.svg 含正确的 emoji
   - [ ] sw.js 含正确的 CDN URL 列表
   - [ ] README.md 为中文产品交付口吻
3. 双击 index.html → Chrome 打开 → 地址栏出现安装图标
4. 点击安装 → 独立窗口，应用正常
5. 点击"发布应用" → "生成分享链接" → 显示成功卡片 + QR 码 + URL
6. 复制链接新窗口打开 → 应用正常
7. 点击"发布应用" → "生成 APK" → 打开 PWABuilder
