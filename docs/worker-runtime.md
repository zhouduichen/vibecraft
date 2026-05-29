# Pipeline Worker 运行手册

## 概述

Python Worker 是一个轻量级 HTTP 服务，封装了 `core/` 模块的配置校验、映射、编排和算子执行能力。Next.js API 路由通过 `src/lib/worker-bridge.ts` 与之通信。

---

## 启动

```bash
# 从项目根目录运行
cd D:\creator

# 必需环境变量
AI_API_BASE_URL=https://api.deepseek.com  \
AI_API_KEY=sk-xxx                         \
AI_MODEL=deepseek-chat                    \
python -m workers.server --port 9120
```

**可选参数**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--host` | `127.0.0.1` | 监听地址 |
| `--port` | `9120` | 监听端口 |
| `--dry-run` | `false` | 所有请求强制走 dry-run（不执行真实算子） |

---

## 必需环境变量

| 变量 | 用途 |
|------|------|
| `AI_API_BASE_URL` | OpenAI 兼容 API 端点 |
| `AI_API_KEY` | 认证密钥（/health/ready 会检查） |
| `AI_MODEL` | 默认模型名 |

---

## API 端点

### `GET /health`

基本存活检查。不需要环境变量即可返回。

```json
{"status": "ok", "dry_run": false, "python_version": "3.12", "pid": 12345}
```

### `GET /health/ready`

完整就绪检查。会验证必需环境变量是否存在。

```json
// 正常
{"status": "ready"}

// 缺少环境变量
{"status": "unready", "missing_env": ["AI_API_KEY"]}
```

### `POST /run`

执行一次完整流水线。

**请求体** — `PipelineConfig` JSON：

```json
{
  "metadata": {
    "project": "my-project-id",
    "config_version": "1.0.0",
    "created_by": "user-uuid"
  },
  "components": [
    {
      "id": "repair-gen",
      "kind": "text_model",
      "provider": "openai",
      "model": "deepseek-chat",
      "system_prompt": "You are a design expert...",
      "prompt": "修复以下 HTML...",
      "temperature": 0.3
    }
  ]
}
```

**成功响应** `200`：

```json
{
  "status": "ok",
  "run_id": "uuid",
  "context": {
    "assets": {},
    "results": {
      "repair-gen": {
        "component_id": "repair-gen",
        "operator": "text_model",
        "success": true,
        "output": {
          "content": "生成的文本或 HTML...",
          "model": "deepseek-chat",
          "usage": {"prompt_tokens": 100, "completion_tokens": 50}
        },
        "error": null,
        "duration_ms": 1234.5
      }
    },
    "metadata": {"exported": true}
  },
  "_elapsed_ms": 1250.0
}
```

**错误响应**：

| 状态码 | 场景 |
|--------|------|
| `400` | 请求体为空、JSON 格式错误 |
| `413` | 请求体超过 10MB |
| `500` | 流水线执行失败（算子错误、校验失败等） |
| `503` | 依赖缺失（仅 `/health/ready`） |

```json
// 500 示例
{"error": "Operator 'img-gen' (image_model) failed: ...", "run_id": "uuid"}
```

### `POST /dry-run`

与 `/run` 行为相同，但所有算子都以 `DryRunOperator` 执行（不调外部 API）。

---

## 从 Next.js 调用

```typescript
import { runPipeline, WorkerUnreachableError } from '@/lib/worker-bridge';

const result = await runPipeline({
  metadata: { project: projectId, config_version: '1.0.0' },
  components: [{
    id: 'repair-gen',
    kind: 'text_model',
    provider: 'openai',
    model: 'deepseek-chat',
    system_prompt: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
  }],
});

const output = result.context.results['repair-gen'];
if (!output.success) {
  throw new Error(output.error || 'pipeline failed');
}
const content = output.output.content as string;
```

**错误处理**：客户端可能抛出 `WorkerUnreachableError`、`WorkerHttpError`、`WorkerSchemaError`（均在 `worker-bridge.ts` 中定义），建议包装在 try-catch 中。

---

## 健康检查与监控

Worker 日志格式（结构化，可直接被日志系统索引）：

```
[worker] INFO run  cid=xxx  run_id=yyy  dry=False  len=1234
[worker] INFO ok   cid=xxx  run_id=yyy  elapsed=567.8ms
[worker] ERROR fail cid=xxx  run_id=yyy  elapsed=123.4ms  err=...
```

每个请求可传入 `X-Correlation-Id` 请求头，用于全链路追踪。

---

## 生产部署建议

1. Worker 作为 sidecar 进程与 Next.js 同机部署，通过 `127.0.0.1:9120` 通信
2. 使用 `systemd`（Linux）或 `nssm`（Windows）管理 Worker 进程生命周期
3. 设置 `restart=always` 策略
4. 监控 `/health` 和 `/health/ready` 端点

---

## 常见错误

| 现象 | 原因 | 解决 |
|------|------|------|
| Worker 返回 500: `AI_API_KEY not set` | 环境变量缺失 | 设置 `AI_API_KEY` 后重启 Worker |
| Worker 连接被拒绝 | Worker 未启动 | 启动 Worker，检查端口是否被占用 |
| 请求返回 413 | 配置 JSON 超过 10MB | 减小组件数量或资产体积 |
| repair 路由返回 502 | Worker 异常或 AI 服务不可用 | 检查 Worker 日志确认错误详情 |
| "Worker response schema error" | Worker 版本与 bridge 不兼容 | 确保 worker-bridge.ts 与 server.py 版本匹配 |

---

## 发布记录

| 版本 | 仓库 | Tag | Commit | 说明 |
|------|------|-----|--------|------|
| RC | `D:/creator` (Python Worker) | `rc-worker-pipeline-v1` | `dea0316` | Phases 1-6 pipeline core, 5 operators, 20 tests |
| RC | `vibecraft/` (Next.js) | `rc-worker-bridge-v1` | `4b7e1d6` | repair route migrated, worker-bridge.ts |
| **Release v1** | `D:/creator` (Python Worker) | **`release-worker-pipeline-v1`** | `8932489` | P0-P1 fixes, dependency validation, A+C observability+deployment |
| **Release v1** | `vibecraft/` (Next.js) | **`release-worker-bridge-v1`** | `bfa8a2e` | P2 error capture, repair route stable error handling |
