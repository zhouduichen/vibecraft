# Release Candidate Checklist

## 前置条件

- [ ] Python 3.11+ 可用
- [ ] Node.js 20+ 可用
- [ ] 必需环境变量已设置（`AI_API_KEY`, `AI_MODEL`）
- [ ] Worker 端口 9120 未被占用
- [ ] 两个 git 仓库处于 clean 状态

## Phase 1: Worker 回归验证

```bash
cd D:/creator

# 1. Pipeline core 回归 (20 tests)
python -m tests.test_pipeline

# 2. 完整 dry-run 链路 (5 算子)
python main.py --config configs/example.json --dry-run

# 3. HTTP 端点测试
python -c "
import json, http.client

def t(method, path, body=None):
    c = http.client.HTTPConnection('127.0.0.1', 9120, timeout=5)
    hdrs = {'Content-Type': 'application/json'} if body else {}
    c.request(method, path, body or b'', hdrs)
    r = c.getresponse()
    d = json.loads(r.read())
    c.close()
    return r.status, d

print('testing /health ...')
status, data = t('GET', '/health')
assert status == 200 and data['status'] == 'ok', f'health: {status}'

print('testing /run with valid config ...')
status, data = t('POST', '/run', json.dumps({
    'metadata': {'project':'rc-test','config_version':'1.0.0'},
    'components': [{'id':'t1','kind':'text_model','provider':'openai','model':'gpt-4','prompt':'hi'}]
}))
assert status == 200 and data['status'] == 'ok', f'run: {status}'

print('testing /run with missing metadata ...')
status, data = t('POST', '/run', json.dumps({'components': []}))
assert status == 400 and data['error'] == 'config validation failed', f'validation: {status}'
assert 'details' in data, 'missing details'

print('all HTTP smoke tests passed')
"
```

## Phase 2: Next.js 验证

```bash
cd D:/creator/vibecraft

# 4. TypeScript 类型检查
npm run typecheck

# 5. Lint
npm run lint

# 6. 构建
npm run build
```

## Phase 3: 端到端 Smoke Test

```bash
# 终端 1: 启动 Worker
cd D:/creator
AI_API_KEY=sk-xxx AI_MODEL=deepseek-chat python -m workers.server --port 9120

# 终端 2: 启动 Next.js
cd D:/creator/vibecraft
npm run dev

# 浏览器: 打开 http://localhost:3000
# 触发一次 repair 操作
# 确认:
#   - Worker 日志打印 run → ok
#   - 前端页面正确显示修复结果
#   - 版本记录正确更新
```

## Phase 4: 发布前最终确认

- [ ] `python -m tests.test_pipeline` — 20/20 通过
- [ ] `python main.py --config configs/example.json --dry-run` — 5 算子全部通过
- [ ] HTTP 端点 200/400/404/413 返回正确
- [ ] `npm run typecheck` — 零错误
- [ ] `npm run lint` — 无新增 warning
- [ ] `npm run build` — 成功
- [ ] 前端 repair 端到端手测通过
- [ ] `rc-worker-pipeline-v1` tag 已打
- [ ] `rc-worker-bridge-v1` tag 已打

## 已知风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| POST >10MB 请求返回 413 后客户端可能 ConnectionAborted | 传输层日志 | 服务端错误判定正确；短期可接受 |
| chat/send 保持 Next 直调 AI + SSE | 流式不经过 Worker | 已记录 ADR，属于有意设计 |
| Worker 无进程管理 | 宕机后需要手动重启 | 建议添加 systemd / nssm 或 docker-compose |
