# VibeCraft

用自然语言创造自己的小应用。选模板，用对话改造，实时预览，一键导出。

线上地址：[vibecraft-gamma.vercel.app](https://vibecraft-gamma.vercel.app)

---

## 前提条件

部署 VibeCraft 需要以下服务和账号（全部提供免费额度）：

| 服务 | 用途 | 注册地址 |
|------|------|----------|
| **Supabase** | PostgreSQL 数据库 | [supabase.com](https://supabase.com) → 创建项目 → Settings → API 获取 URL 和密钥 |
| **GitHub OAuth App** | 用户登录 | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App |
| **DeepSeek API** | AI 对话生成 | [platform.deepseek.com](https://platform.deepseek.com) → API Keys（或用 SiliconFlow 等任意 OpenAI 兼容 API） |
| **Node.js 22+** | 运行环境 | [nodejs.org](https://nodejs.org) |

### GitHub OAuth App 配置

创建 OAuth App 时填写：

| 字段 | 本地部署 | 线上部署 |
|------|----------|----------|
| Homepage URL | `http://localhost:3008` | `https://你的域名.vercel.app` |
| Authorization callback URL | `http://localhost:3008/auth/callback/github` | `https://你的域名.vercel.app/auth/callback/github` |

创建后会得到 `Client ID` 和 `Client Secret`。

---

## 方式一：本地开发部署

```bash
# 1. 克隆项目
git clone https://github.com/zhouduichen/vibecraft.git
cd vibecraft

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入下面所有变量

# 4. 初始化数据库
# 打开 Supabase → SQL Editor，执行 database.sql 中的全部语句

# 5. 启动
npm run dev
```

打开 [http://localhost:3008](http://localhost:3008)。

### 环境变量清单

编辑 `.env.local`，填入你的实际值：

```bash
# Supabase（Supabase 控制台 → Settings → API）
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_你的service_role密钥

# NextAuth 认证
AUTH_URL=http://localhost:3008                          # 本地用这个；线上改成实际域名
AUTH_SECRET=运行 openssl rand -base64 32 生成一个       # 或用任意长随机字符串
AUTH_GITHUB_ID=你的GitHub OAuth Client ID
AUTH_GITHUB_SECRET=你的GitHub OAuth Client Secret

# AI API（OpenAI 兼容协议）
AI_API_BASE_URL=https://api.deepseek.com                # 或其他兼容 API 地址
AI_API_KEY=sk-你的API密钥
AI_MODEL=deepseek-chat
```

### 初始化数据库

打开 Supabase 控制台 → **SQL Editor** → 复制 `database.sql` 的全部内容 → 点击 **Run**。

这会创建以下表：
- `users` — 用户信息与积分
- `projects` — 项目内容与设置
- `versions` — 版本历史快照
- `published_apps` — 已发布应用
- `credit_transactions` — 积分流水

---

## 方式二：Docker 部署

```bash
# 1. 准备 .env.local（同上）
cp .env.local.example .env.local
# 编辑填入所有变量

# 2. 启动（映射 3008 端口到容器内 3000）
docker compose up -d

# 3. 查看日志
docker compose logs -f
```

打开 [http://localhost:3008](http://localhost:3008)。

需要停止：`docker compose down`

---

## 本地开发命令

```bash
npm run dev         # 启动开发服务器
npm run build       # 生产构建
npm run start       # 运行生产构建

npm run lint        # ESLint 代码检查
npm run typecheck   # TypeScript 类型检查
npm run test:e2e    # Playwright E2E 测试
npm run verify      # 完整验证（lint + typecheck + build + e2e）
```

---

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 用 GitHub 登录
3. 点击 **New Project** → 导入 vibecraft 仓库
4. 在 Settings → Environment Variables 中填入上面的所有环境变量（`AUTH_URL` 改成实际域名）
5. 点 **Deploy**
6. 部署成功后回到 GitHub OAuth App 设置，把 Homepage URL 和 Callback URL 都更新为线上的实际域名

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 认证 | NextAuth v5 (GitHub OAuth) |
| 数据库 | Supabase (PostgreSQL) |
| AI | OpenAI 兼容 API（DeepSeek / SiliconFlow 等） |
| 测试 | Playwright (E2E) |
| 部署 | Vercel / Docker |

---

## 项目结构

```
src/
├── app/
│   ├── api/           # API 路由（projects, chat, export, auth）
│   ├── app/[slug]/    # 已发布应用页面
│   ├── project/[id]/  # 项目编辑页
│   ├── login/         # 登录页
│   └── page.tsx       # 首页
├── components/        # UI 组件
├── hooks/             # React Hooks
├── lib/               # 工具库（auth, db, AI prompt 等）
├── config/            # 配置文件（skills 等）
└── proxy.ts           # NextAuth 中间件
```

## 安全

生成的 HTML 被视为不可信内容。预览和模板 iframe 在受限 sandbox 中运行；VibeCraft 注入轻量 storage shim 确保生成的应用在浏览器存储被阻止时不会崩溃。发布的应用在配置独立隔离源之前不应用于敏感数据。
