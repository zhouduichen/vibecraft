import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import JSZip from 'jszip';

// Extract inline manifest JSON from HTML
function extractManifest(html: string): Record<string, unknown> | null {
  const m = html.match(/href="data:application\/json,([^"]+)"/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}

// Extract emoji from manifest or HTML for icon generation
function extractEmoji(manifest: Record<string, unknown> | null, html: string): string {
  if (manifest) {
    const icons = (manifest as any).icons;
    if (Array.isArray(icons) && icons[0]?.src) {
      const src = String(icons[0].src);
      // Try to extract emoji from SVG data URI
      const svgMatch = src.match(/>([\p{Emoji}])</u);
      if (svgMatch) return svgMatch[1];
      // Try direct emoji in src
      const emojiMatch = src.match(/[\p{Emoji}]/u);
      if (emojiMatch) return emojiMatch[0];
    }
  }
  // Fallback: scan HTML <title> for emoji
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/);
  if (titleM) {
    const emojiMatch = titleM[1].match(/[\p{Emoji}]/u);
    if (emojiMatch) return emojiMatch[0];
  }
  return '📱';
}

// Extract all CDN script URLs from HTML
function extractCdnUrls(html: string): string[] {
  return [...html.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
}

// Generate SVG icon file
function makeSvgIcon(emoji: string, size: number, bgColor: string): string {
  const rx = Math.round(size * 0.17);
  const fontSize = Math.round(size * 0.5);
  const y = Math.round(size * 0.7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect fill="${bgColor}" width="${size}" height="${size}" rx="${rx}"/>
  <text x="${size / 2}" y="${y}" text-anchor="middle" font-size="${fontSize}">${emoji}</text>
</svg>`;
}

// Generate service worker JS
function makeServiceWorker(cdnUrls: string[]): string {
  const urlList = cdnUrls.map(u => `'${u}'`).join(', ');
  return `const CACHE_NAME = 'vibecraft-v1';
const URLS = ['./index.html', ${urlList}];

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

// Rewrite manifest — replace icons with actual file paths
function rewriteManifest(manifest: Record<string, unknown>): string {
  const m = JSON.parse(JSON.stringify(manifest));
  (m as any).icons = [
    { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
  ];
  return JSON.stringify(m, null, 2);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { projectId } = await req.json();

  const { data: project } = await db
    .from('projects')
    .select('current_html, name')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // ── Extract metadata ──
  const manifest = extractManifest(project.current_html);
  const emoji = extractEmoji(manifest, project.current_html);
  const themeColor = (manifest as any)?.theme_color || '#6366f1';
  const cdnUrls = extractCdnUrls(project.current_html);
  const folder = project.name.replace(/[<>:"/\\|?*]/g, '_');

  // ── Generate assets ──
  const manifestJson = manifest ? rewriteManifest(manifest) : null;
  const swJs = makeServiceWorker(cdnUrls);
  const icon192 = makeSvgIcon(emoji, 192, themeColor);
  const icon512 = makeSvgIcon(emoji, 512, themeColor);

  // ── README.md (Chinese, product-delivery tone) ──
  const readme = [
    `# ${project.name}`,
    '',
    '你的应用已构建完成。',
    '',
    '## 包含文件',
    '',
    '- `index.html` — 应用主文件（双击即可打开使用）',
    '- `sw.js` — 离线运行支持（断网也能打开）',
    ...(manifestJson ? ['- `manifest.json` — PWA 应用配置'] : []),
    '- `icons/` — 应用图标',
    '- `README.md` — 本说明文件',
    '- `安装到桌面.txt` — 各平台安装指引',
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

  return new NextResponse(Buffer.from(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name)}.zip"`,
    },
  });
}
