# VibeCraft

用自然语言创造自己的小应用。选模板，用对话改造，实时预览，一键导出。

线上地址：[vibecraft-gamma.vercel.app](https://vibecraft-gamma.vercel.app)

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3008](http://localhost:3008)。

## 功能

### 模板市场
从记账本、Todo、打卡手账等模板出发，一键创建项目。

### AI 对话改造
用自然语言描述需求——"加个饼图"、"背景换成深色"——AI 实时改写完整代码，在右侧 iframe 中即时预览。

### 项目管理
首页弹出式对话框管理所有作品。支持：
- **删除、归档、恢复**项目
- **复制、置顶**收藏项目
- 卡片式布局，HTML 实时缩略图预览

### 设计增强
可选的设计品质开关。开启后进入多轮 Teach 对话，确定你的审美偏好（安静克制 / 温暖亲切 / 鲜明醒目），之后所有 AI 生成自动注入设计规范：配色、排版、间距、动效、无障碍。随时可关闭或重新设定。

### 技能扩展
为项目叠加功能技能——图表可视化、Excel 导出、超支提醒等，技能随项目模板智能兼容。

### 版本历史
每次 AI 修改自动生成版本快照，随时回退到之前任何版本。

### 导出
- **ZIP 下载** — 单文件 HTML，任何浏览器打开即用
- **分享链接 + 二维码** — 手机扫码即可打开，支持 PWA 添加到主屏幕

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 认证 | NextAuth v5 (GitHub OAuth) |
| 数据库 | Supabase (PostgreSQL) |
| AI | DeepSeek API (兼容 OpenAI) |
| 测试 | Playwright (E2E) + 单元测试 |
| 部署 | Vercel / Docker |

## 环境变量

复制 `.env.local.example` 为 `.env.local`，填入以下变量：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥 |
| `AUTH_SECRET` | NextAuth 加密密钥 (`openssl rand -base64 32`) |
| `AUTH_URL` | 部署域名（本地为 `http://localhost:3008`） |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `AI_API_BASE_URL` | AI API 地址（兼容 OpenAI 协议） |
| `AI_API_KEY` | AI API 密钥 |
| `AI_MODEL` | 模型名称（如 `deepseek-chat`） |

## 数据库

在 Supabase SQL Editor 中执行 `database.sql` 中的全部迁移语句，包括：

- `users` — 用户与积分
- `projects` — 项目主体
- `versions` — 版本快照
- `published_apps` — 已发布应用
- `credit_transactions` — 积分流水

## 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入仓库
3. 在 Settings → Environment Variables 中填入所有环境变量
4. 确保 `AUTH_URL` 设为实际域名（如 `https://vibecraft-gamma.vercel.app`）
5. 在 GitHub OAuth App 中更新 Callback URL：`https://你的域名/auth/callback/github`
6. Deploy

### Docker

```bash
docker compose up -d
```

默认监听 `3008:3000`。

## 本地开发

```bash
npm install
npm run dev        # 启动开发服务器 (localhost:3008)
```

```bash
npm run build      # 生产构建
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run test:e2e   # Playwright E2E 测试
npm run verify     # 完整验证（lint + typecheck + build + e2e）
```

## 安全

生成的 HTML 被视为不可信内容。预览和模板 iframe 在无 `allow-same-origin` 的 sandbox 中运行；VibeCraft 注入轻量 storage shim 确保生成的应用在浏览器存储被阻止时不会崩溃。发布的应用在配置独立隔离源之前不应用于敏感数据。
