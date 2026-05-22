import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import JSZip from 'jszip';

interface WebAppManifest extends Record<string, unknown> {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  icons?: Array<Record<string, unknown>>;
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function parseManifestPayload(payload: string): WebAppManifest | null {
  const candidates = [payload];
  try {
    candidates.push(decodeURIComponent(payload));
  } catch {
    // Keep the raw candidate only.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed as WebAppManifest;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function extractManifest(html: string): WebAppManifest | null {
  const manifestTag = html.match(/<link\b(?=[^>]*\brel=["']manifest["'])[^>]*>/i)?.[0];
  if (!manifestTag) return null;

  const href = manifestTag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
  if (href?.startsWith('data:application/json,')) {
    const parsed = parseManifestPayload(href.slice('data:application/json,'.length));
    if (parsed) return parsed;
  }

  const rawPayload = manifestTag.match(/data:application\/json,(\{[\s\S]*\})/i)?.[1];
  return rawPayload ? parseManifestPayload(rawPayload) : null;
}

function findEmoji(text: string | undefined): string | null {
  if (!text) return null;
  return text.match(EMOJI_RE)?.[0] || null;
}

function extractEmoji(manifest: WebAppManifest | null, html: string): string {
  for (const icon of manifest?.icons || []) {
    const src = typeof icon.src === 'string' ? icon.src : '';
    const emoji = findEmoji(src);
    if (emoji) return emoji;
    try {
      const decoded = decodeURIComponent(src);
      const decodedEmoji = findEmoji(decoded);
      if (decodedEmoji) return decodedEmoji;
    } catch {
      // Ignore malformed icon data URIs.
    }
  }

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  return findEmoji(title) || findEmoji(html) || '📱';
}

function extractCdnUrls(html: string): string[] {
  return [...html.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/g)].map(match => match[1]);
}

function makeSvgIcon(emoji: string, size: number, bgColor: string): string {
  const rx = Math.round(size * 0.17);
  const fontSize = Math.round(size * 0.5);
  const y = Math.round(size * 0.7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect fill="${bgColor}" width="${size}" height="${size}" rx="${rx}"/>
  <text x="${size / 2}" y="${y}" text-anchor="middle" font-size="${fontSize}">${emoji}</text>
</svg>`;
}

function makeServiceWorker(cdnUrls: string[]): string {
  const urls = ['./index.html', ...cdnUrls];
  return `const CACHE_NAME = 'vibecraft-export-v1';
const PRECACHE_URLS = ${JSON.stringify(urls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of PRECACHE_URLS) {
      try {
        await cache.add(url);
      } catch {
        // Skip assets that cannot be cached during install.
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    const response = await fetch(event.request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, response.clone());
    }
    return response;
  })());
});`;
}

function rewriteManifest(manifest: WebAppManifest, appName: string): string {
  const rewritten: WebAppManifest = {
    ...manifest,
    name: typeof manifest.name === 'string' ? manifest.name : appName,
    short_name: typeof manifest.short_name === 'string' ? manifest.short_name : appName.slice(0, 12),
    start_url: './index.html',
    scope: './',
    display: typeof manifest.display === 'string' ? manifest.display : 'standalone',
    background_color: typeof manifest.background_color === 'string' ? manifest.background_color : '#0f172a',
    theme_color: typeof manifest.theme_color === 'string' ? manifest.theme_color : '#6366f1',
    icons: [
      { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  };
  return JSON.stringify(rewritten, null, 2);
}

function buildDefaultManifest(appName: string): WebAppManifest {
  return {
    name: appName,
    short_name: appName.slice(0, 12),
    start_url: './index.html',
    scope: './',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#6366f1',
  };
}

function prepareExportHtml(html: string): string {
  const manifestTag = '<link rel="manifest" href="./manifest.json">';
  const manifestTagPattern = /<link\b(?=[^>]*\brel=["']manifest["'])[^>]*>/i;
  const withManifest = manifestTagPattern.test(html)
    ? html.replace(manifestTagPattern, manifestTag)
    : html.replace(/<\/head>/i, `  ${manifestTag}\n</head>`);

  if (/serviceWorker\.register/i.test(withManifest)) return withManifest;

  const swScript = `<script>
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
</script>`;

  return /<\/body>/i.test(withManifest)
    ? withManifest.replace(/<\/body>/i, `${swScript}\n</body>`)
    : `${withManifest}\n${swScript}`;
}

function safeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || '应用';
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { projectId } = await req.json() as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: '缺少项目 ID' }, { status: 400 });
  }

  const { data: project } = await db
    .from('projects')
    .select('current_html, name')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const appName = String(project.name || '应用');
  const manifest = extractManifest(project.current_html) || buildDefaultManifest(appName);
  const emoji = extractEmoji(manifest, project.current_html);
  const themeColor = typeof manifest.theme_color === 'string' ? manifest.theme_color : '#6366f1';
  const cdnUrls = extractCdnUrls(project.current_html);
  const folder = safeFolderName(appName);

  const manifestJson = rewriteManifest(manifest, appName);
  const exportHtml = prepareExportHtml(project.current_html);
  const swJs = makeServiceWorker(cdnUrls);
  const icon192 = makeSvgIcon(emoji, 192, themeColor);
  const icon512 = makeSvgIcon(emoji, 512, themeColor);

  const readme = [
    `# ${appName}`,
    '',
    '你的应用已构建完成。',
    '',
    '## 包含文件',
    '',
    '- `index.html` - 应用主文件',
    '- `manifest.json` - PWA 应用配置',
    '- `sw.js` - 离线运行支持',
    '- `icons/` - 应用图标',
    '- `安装到桌面.txt` - 各平台安装指引',
    '',
    '## 安装到桌面',
    '',
    '请先把整个文件夹部署到 HTTPS 或 localhost 环境，再用 Chrome 或 Edge 打开 `index.html`。',
    '浏览器地址栏出现安装图标后，点击即可安装为独立窗口应用。',
    '',
    '## 安装到手机',
    '',
    '查看 `安装到桌面.txt` 了解各平台详细步骤。',
    '',
    `> 由 VibeCraft 生成 - ${new Date().toLocaleDateString('zh-CN')}`,
  ].join('\n');

  const installGuide = [
    '=== 安装到桌面 ===',
    '',
    '【Windows / Mac】',
    '1. 将整个文件夹部署到 HTTPS 或 localhost 环境',
    '2. 用 Chrome 或 Edge 浏览器打开 index.html',
    '3. 地址栏右侧出现安装图标后点击“安装”',
    '',
    '【Android 手机】',
    '1. 将应用发布到 HTTPS 地址',
    '2. 用 Chrome 浏览器打开该地址',
    '3. 选择“添加到主屏幕”',
    '',
    '【iPhone】',
    '1. 将应用发布到 HTTPS 地址',
    '2. 用 Safari 浏览器打开该地址',
    '3. 点击分享按钮，选择“添加到主屏幕”',
    '',
    '=== 生成 APK 安装包（Android） ===',
    '',
    '1. 用 Chrome 访问 https://pwabuilder.com',
    '2. 输入已发布的 HTTPS 地址',
    '3. 按提示生成 APK，下载后安装到手机',
  ].join('\n');

  const zip = new JSZip();
  const root = zip.folder(folder)!;
  root.file('index.html', exportHtml);
  root.file('manifest.json', manifestJson);
  root.file('sw.js', swJs);
  root.file('README.md', readme);
  root.file('安装到桌面.txt', installGuide);

  const icons = root.folder('icons')!;
  icons.file('icon-192.svg', icon192);
  icons.file('icon-512.svg', icon512);

  const content = await zip.generateAsync({ type: 'uint8array' });

  return new NextResponse(Buffer.from(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(appName)}.zip`,
    },
  });
}
