# Architecture: Worker Pipeline

## Overview

The VibeCraft pipeline architecture separates computational pipeline execution (Python Worker) from UI/project management (Next.js). Communication happens over a local HTTP bridge.

```
┌──────────────────────┐       HTTP/1.1        ┌──────────────────────┐
│   Next.js (vibecraft)│ ◄──────────────────►  │  Python Worker       │
│                      │  127.0.0.1:9120       │  (D:/creator)        │
│  src/app/api/chat/   │                       │                      │
│    repair/route.ts   │                       │  workers/server.py   │
│  src/lib/            │                       │  core/               │
│    worker-bridge.ts  │                       │    schemas.py        │
└──────────────────────┘                       │    mapper.py         │
                                               │    orchestrator.py   │
                                               │    operators/        │
                                               │      text_model.py   │
                                               │      image_model.py  │
                                               │      resize.py       │
                                               │      composite.py    │
                                               │      export.py       │
                                               │      dry_run.py      │
                                               └──────────────────────┘
```

## Pipeline Execution Flow

```
Request (JSON)
    │
    ▼
[1] HTTP Handler (workers/server.py)
    │  Parse JSON, validate Content-Length (<10MB)
    │  Assign run_id (UUID v4), correlation ID from header
    ▼
[2] PipelineOrchestrator.run()
    │
    ├─ [2a] Load Assets ────────────── reads raw_config.assets → context.assets
    ├─ [2b] Validate & Map ─────────── ConfigValidator → PipelineConfig → InternalOperatorParams
    ├─ [2c] Execute Operators ──────── for each component (respecting depends_on):
    │      ┌──────────────────────────────────────────────┐
    │      │  OperatorRegistry.select(kind)                │
    │      │    → DryRunOperator (if --dry-run)             │
    │      │    → Real Operator (TextModel, ImageModel, …) │
    │      │  timed_run(op, params, context)               │
    │      │    → OperatorResult{success, output, error,   │
    │      │                       duration_ms}            │
    │      └──────────────────────────────────────────────┘
    └─ [2d] Render/Export ─────────── set context.metadata.exported = true
    │
    ▼
Response (JSON)
    status: "ok" | "error"
    context:
      assets: {...}
      results:
        <component_id>:
          operator, success, output, error, duration_ms
      metadata: {exported: bool}
```

## Worker HTTP API

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | Liveness check | 200 |
| `/health/ready` | GET | Readiness (env vars verified) | 200 / 503 |
| `/run` | POST | Execute pipeline | 200 / 400 / 413 / 500 |
| `/dry-run` | POST | Execute with DryRunOperator | 200 / 400 / 413 / 500 |

## Component Lifecycle

```
Config (JSON) 
  → TextModelConfig / ImageModelConfig / ResizeConfig / CompositeConfig / ExportConfig
  → ConfigMapper._map_component()
  → InternalOperatorParams{ component_id, operator, payload, depends_on }
  → OperatorRegistry selects operator instance
  → operator.run(params, context)
  → OperatorResult
  → stored in context.results[component_id]
```

## Dry-Run Mode

When `--dry-run` is set (or path is `/dry-run`), all operators are replaced with `DryRunOperator`. The full pipeline executes end-to-end — validation, mapping, orchestration, and result assembly — but no external API calls are made. `DryRunOperator` returns:

```json
{"dry_run": true, "validated_payload_keys": [...], "depends_on": [...]}
```

This guarantees that:
- Config validation catches errors before any real cost
- depends_on ordering is verified
- Every output schema is produced
- No side effects occur

## Checkpoint & Resume

`CheckpointStore` persists `PipelineState` as JSON after each step. On failure:
1. Current state is saved with `failed_step` and `error` message
2. On `resume=True`, completed steps are skipped
3. Failed or pending steps re-execute

Checkpoint steps tracked:
- `load_assets`
- `validate_params`
- `operator:<component_id>` (one per component)
- `render_export`

## Key Design Decisions

- **stdlib only**: Worker uses `http.server` + `urllib` — zero external Python dependencies for the core loop
- **extra="forbid"**: All Pydantic models reject unknown fields, catching config drift at validation time
- **No shared state**: Each request creates a fresh orchestrator, context, and checkpoint store
- **Result schema compatibility**: `worker-bridge.ts` validates the response shape to catch version drift between repos
