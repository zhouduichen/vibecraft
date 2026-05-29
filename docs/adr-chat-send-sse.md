# ADR: chat/send Streaming Design

## Status

Accepted (2026-05-29)

## Context

The `chat/send` API route produces a streaming response via Server-Sent Events (SSE):

```
Next.js API Route ← SSE stream ← AI API (OpenAI-compatible)
                              → Browser (ReadableStream)
```

During the Phase 4-5 migration, `chat/repair` (non-streaming) was migrated from direct AI API fetch to the Python Worker pipeline. The question arose whether `chat/send` should follow the same path.

## Decision

`chat/send` remains as a direct AI API call from Next.js. The Worker handles streaming as a future enhancement only.

## Rationale

### 1. SSE via Worker requires a bidirectional streaming bridge

The current Worker HTTP server (`http.server` + `BaseHTTPRequestHandler`) is request-response only. To support SSE:

```
Browser ← SSE ← Next.js ← SSE ← Python Worker ← SSE ← AI API
```

This creates a double-SSE pipeline. The Worker must:
- Accept a POST and hold the connection open
- Stream chunks from the AI API as it receives them
- Forward each chunk to Next.js, which forwards to the browser

Python's `http.server` is not designed for this pattern. A production SSE pipeline would need either:
- `FastAPI` / `Starlette` with `StreamingResponse`
- WebSocket tunnel
- Chunked transfer encoding with careful buffer management

### 2. Engineering cost vs user benefit

| Approach | Cost | Benefit |
|----------|------|---------|
| Keep direct SSE in Next | Near-zero | Streaming works, no new infra |
| Migrate to Worker SSE | High (new HTTP framework, streaming protocol, error handling for mid-stream failures) | Marginal (single data path, but adds latency from an extra hop) |

### 3. No architectural debt

The direct SSE path does not conflict with the Worker pipeline architecture:
- It reads AI config from the same env vars (`AI_API_KEY`, `AI_MODEL`, `AI_API_BASE_URL`)
- It produces the same SSE message format
- It can be wrapped into a pipeline component later without breaking existing clients

## Future Path

If Worker is migrated to `FastAPI + uvicorn`, streaming becomes straightforward:

```python
@app.post("/chat/stream")
async def chat_stream(request: Request):
    return StreamingResponse(
        generate(request), media_type="text/event-stream"
    )
```

At that point, `chat/send` can be added as a new pipeline component (e.g., `chat_stream` kind) without removing the direct SSE path — offering a gradual migration.

## Consequences

- Positive: Zero risk to the streaming UX during RC
- Positive: Worker stays simple (stdlib only)
- Positive: Clear upgrade path when the streaming requirement becomes critical
- Negative: Two data paths exist (Worker for non-streaming, direct for streaming)
