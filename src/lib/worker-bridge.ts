// Bridge between Next.js API routes and the Python pipeline worker.
//
// ## Usage
//
//   const result = await runPipeline(config);
//   const output = result.context.results['repair-gen'].output.content;
//
// ## Worker startup
//
//   AI_API_BASE_URL=https://api.deepseek.com  \
//   AI_API_KEY=sk-xxx                         \
//   AI_MODEL=deepseek-chat                    \
//   python -m workers.server --port 9120
//
// ## Env
//
//   WORKER_URL   default http://127.0.0.1:9120

const WORKER_URL = process.env.WORKER_URL || 'http://127.0.0.1:9120';
const WORKER_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Types — mirror the Python core/operators/base.py OperatorResult schema
// ---------------------------------------------------------------------------

export interface WorkerComponent {
  id: string;
  kind: string;
  [key: string]: unknown;
}

export interface WorkerConfig {
  metadata: {
    project: string;
    config_version: string;
    pipeline_version?: string;
    created_by?: string;
  };
  assets?: Array<{ id: string; path: string; required?: boolean }>;
  params?: Record<string, unknown>;
  components: WorkerComponent[];
}

export interface OperatorResult {
  component_id: string;
  operator: string;
  success: boolean;
  output: Record<string, unknown>;
  error: string | null;
  duration_ms: number;
}

export interface WorkerContext {
  assets: Record<string, unknown>;
  results: Record<string, OperatorResult>;
  metadata: Record<string, unknown>;
}

export interface WorkerResult {
  status: string;
  run_id: string;
  context: WorkerContext;
  _elapsed_ms?: number;
}

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

export class WorkerUnreachableError extends Error {
  constructor(cause: unknown) {
    super(`Worker unreachable at ${WORKER_URL}`);
    this.name = 'WorkerUnreachableError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export class WorkerHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    endpoint: string,
  ) {
    super(`Worker returned ${status}: ${body.slice(0, 300)}`);
    this.name = 'WorkerHttpError';
  }
}

export class WorkerSchemaError extends Error {
  constructor(detail: string) {
    super(`Worker response schema error: ${detail}`);
    this.name = 'WorkerSchemaError';
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function validateWorkerResult(data: unknown): WorkerResult {
  if (!data || typeof data !== 'object') {
    throw new WorkerSchemaError('response is not an object');
  }
  const obj = data as Record<string, unknown>;
  if (obj.status !== 'ok') {
    throw new WorkerSchemaError(`status is "${String(obj.status)}", expected "ok"`);
  }
  const ctx = obj.context;
  if (!ctx || typeof ctx !== 'object') {
    throw new WorkerSchemaError('context is missing or not an object');
  }
  const c = ctx as Record<string, unknown>;
  if (!c.results || typeof c.results !== 'object') {
    throw new WorkerSchemaError('context.results is missing or not an object');
  }
  return data as WorkerResult;
}

async function callWorker(
  endpoint: '/run' | '/dry-run',
  config: WorkerConfig,
  correlationId?: string,
): Promise<WorkerResult> {
  const url = `${WORKER_URL}${endpoint}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (correlationId) headers['X-Correlation-Id'] = correlationId;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
    });
  } catch (err) {
    // fetch throws TypeError / AbortError on network errors or timeout
    if (err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new WorkerUnreachableError(err);
    }
    throw err;
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new WorkerHttpError(resp.status, body, endpoint);
  }

  const raw: unknown = await resp.json().catch(() => null);
  return validateWorkerResult(raw);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Execute a pipeline config through the worker server. */
export async function runPipeline(
  config: WorkerConfig,
  correlationId?: string,
): Promise<WorkerResult> {
  return callWorker('/run', config, correlationId);
}

/** Validate a pipeline config without executing real operators. */
export async function dryRunPipeline(
  config: WorkerConfig,
  correlationId?: string,
): Promise<WorkerResult> {
  return callWorker('/dry-run', config, correlationId);
}
