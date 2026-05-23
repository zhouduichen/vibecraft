# VibeCraft

用自然语言创造自己的小应用。选模板，用对话改造，实时预览，一键导出。

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 功能

### 模板市场
从记账本、Todo、打卡手账等模板出发，一键创建项目。

### AI 对话改造
用自然语言描述需求——"加个饼图"、"背景换成深色"——AI 实时改写完整代码，在右侧 iframe 中即时预览。

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

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth (GitHub OAuth)
- Supabase (PostgreSQL)
- DeepSeek API (AI 对话)

## 环境变量

复制 `.env.local.example` 为 `.env.local`，填入：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥 |
| `AUTH_SECRET` | NextAuth 加密密钥 |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth 应用凭证 |
| `AI_API_BASE_URL` | AI API 地址（兼容 OpenAI 协议） |
| `AI_API_KEY` | AI API 密钥 |
| `AI_MODEL` | 模型名称 |

## 数据库

在 Supabase SQL Editor 中执行以下迁移：

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_profile JSONB DEFAULT NULL;
```

完整的 schema 见 `database.sql`。

## Verification

Use `npm.cmd` on Windows PowerShell if `npm` is blocked by execution policy:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

## Generated App Security

Generated HTML is treated as untrusted. Preview and template iframes run in a sandbox without `allow-same-origin`; VibeCraft injects a small storage fallback so generated apps do not crash when browser storage is blocked. Published apps should not be used for sensitive data until a dedicated isolated origin is configured.
