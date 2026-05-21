# Complete App Export — 设计规格

**日期**：2026-05-21  
**状态**：设计中

---

## 目标

将 VibeCraft 导出从"下载一个 HTML 文件"升级为"发布一个完整应用"的体验。桌面通过 PWA 安装，手机通过 PWA + PWABuilder 路径生成 APK。用户感知：我造了一个真正的 App。

---

## 数据本地化约定

所有模板应用数据（记账记录、打卡数据等）存储在浏览器 `localStorage` 中，每个设备独立，不跨设备同步。导出的应用延续此策略，无需改动模板。

---

## 一、ZIP 包结构

导出 ZIP 时，创建一个以项目名命名的文件夹包裹所有文件：

```
我的记账本/
├── index.html          ← 完整可运行的应用
├── manifest.json       ← 从 HTML 内联 manifest 提取
├── sw.js               ← 离线缓存 + 首次安装缓存
├── icons/
│   ├── icon-192.svg    ← emoji 渲染的 SVG，从 manifest 提取
│   └── icon-512.svg    ← 同上
├── README.md           ← 中文产品交付口吻
└── 安装到桌面.txt       ← 各平台安装步骤（分桌面/Android/iOS）
```

### manifest.json

从 `index.html` 中 `<link rel="manifest" href="data:application/json,...">` 提取 JSON。将图标字段替换为实际文件路径：

```json
{
  "name": "我的记账本",
  "short_name": "记账本",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "icons/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "icons/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

### 图标生成

从 HTML 中的 manifest data URI 提取 emoji（如 `💰`），生成纯文本 SVG 文件写入 ZIP。服务端无需 Canvas 包，直接拼接 SVG 字符串即可。SVG 在 PWA manifest 中广泛支持。

```svg
<!-- icon-192.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect fill="#6366f1" width="192" height="192" rx="32"/>
  <text x="96" y="126" text-anchor="middle" font-size="96">💰</text>
</svg>
```

提取时从 manifest JSON 中取 `theme_color` 做背景色，取模板 icon emoji 做内容。提取失败则用默认 `📱`。

### sw.js

服务端生成时，从 `current_html` 中扫描所有 `<script src="...">` 标签提取 CDN URL 列表，动态注入 sw.js。核心逻辑：

```javascript
const CACHE_NAME = 'vibecraft-v1';
// 以下 URL 从 index.html 中 <script src="..."> 自动提取
const CDN_URLS = ['https://cdn.tailwindcss.com', 'https://unpkg.com/react@18/...', ...];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./index.html', ...CDN_URLS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (fetchResponse.ok) {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return fetchResponse;
      });
    })
  );
});
```

提取逻辑（服务端）：`const cdnUrls = [...current_html.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/g)].map(m => m[1]);`

策略：安装时预缓存 HTML + CDN 依赖，运行时优先缓存，缓存未命中则网络请求并动态缓存。断网时应用可完整运行。

### README.md

产品交付口吻：

```markdown
# 我的记账本

你的应用已构建完成，包含以下内容：

- `index.html` — 应用主文件
- `sw.js` — 离线运行支持（断网也能用）
- `manifest.json` — PWA 应用配置
- `icons/` — 应用图标
- `安装到桌面.txt` — 安装指引

## 一键安装到桌面（Windows / Mac）

1. 用 Chrome 或 Edge 打开 index.html
2. 点击地址栏右侧的安装图标
3. 应用将以独立窗口运行，像普通软件一样

## 安装到手机

查看 `安装到桌面.txt` 了解详细步骤。
```

### 安装到桌面.txt

```text
=== 安装到桌面 ===

【Windows / Mac】
1. 用 Chrome 或 Edge 浏览器打开 index.html
2. 地址栏右侧出现安装图标 → 点击"安装"
3. 桌面出现独立窗口，开始菜单搜索即可打开

【Android 手机】
1. 用 Chrome 浏览器打开 index.html
2. 底部弹出"添加到主屏幕"
3. 主屏幕出现应用图标，点击即可使用

【iPhone】
1. 用 Safari 浏览器打开 index.html
2. 点击底部分享按钮 → "添加到主屏幕"
3. 桌面出现应用图标，点击即可使用

=== 生成 APK 安装包（Android） ===

1. 访问 https://pwabuilder.com
2. 点击"开始" → 上传整个 ZIP 文件
3. 按提示生成 APK，下载后可直接安装到手机
```

---

## 二、导出菜单改为"发布应用"

`ExportMenu.tsx` 中"导出"按钮改名为"发布应用"。下拉菜单改为更明确的双栏选择：

```
┌─────────────────────────────────────┐
│  发布应用                           │
│                                     │
│  📦 下载到电脑                       │
│  打包为完整应用，解压后即可安装到桌面   │
│                                     │
│  🔗 生成分享链接                     │
│  发布到线上，扫码或链接即可打开        │
│                                     │
│  📱 生成 APK（新）                   │
│  自动跳转 PWABuilder，下载 APK 安装包 │
└─────────────────────────────────────┘
```

第三条"生成 APK"直接打开 PWABuilder 链接（带 `https://pwabuilder.com/`），用户上传 ZIP 即可。

---

## 三、发布成功体验

点击"生成分享链接"后，不只显示 URL，改为卡片式确认：

```
┌─────────────────────────────────────┐
│  🎉 发布成功！                      │
│                                     │
│  你的应用已上线，可通过以下方式分享：  │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ http://localhost:3008/app/xx │   │
│  │ [复制]                        │   │
│  └──────────────────────────────┘   │
│                                     │
│  [QR 码]                            │
│                                     │
│  手机扫码或复制链接分享给他人          │
│                                     │
│  ── 或 ──                           │
│                                     │
│  下载完整应用包，可安装到桌面/手机     │
│  [下载 ZIP]                          │
└─────────────────────────────────────┘
```

---

## 四、实施范围

### 改动的文件

| 文件 | 改动 |
|------|------|
| `src/app/api/export/zip/route.ts` | 生成文件夹结构、sw.js、图标、更新 README |
| `src/app/api/export/publish/route.ts` | 无大改（URL 已在前期修复） |
| `src/components/ExportMenu.tsx` | 重命名为"发布应用"，增加 APK 入口 |
| `src/app/project/[id]/page.tsx` | 无改动 |

### 不改动的文件

- `src/config/templates.ts` — 模板 HTML 不动
- `src/app/app/[slug]/page.tsx` — 已发布页面不动
- `.env.local` — 已修正

---

## 五、验证清单

1. 进入项目 → 点击"发布应用" → "下载到电脑"
2. 解压 ZIP → 确认文件夹结构（含 icons/sw.js/manifest.json/README/安装到桌面.txt）
3. 双击 `index.html` → Chrome 打开 → 地址栏出现安装图标
4. 点击安装 → 独立窗口出现，应用正常使用
5. 断网后 → 独立窗口仍可打开 + 使用（数据在 localStorage）
6. "生成分享链接" → 显示发布成功卡片 + QR 码 + 复制链接
7. "生成 APK" → 打开 PWABuilder 页面
