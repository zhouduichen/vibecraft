from __future__ import annotations

import argparse
import datetime
import json
import logging
import os
import time
import traceback
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from uuid import uuid4

from pydantic import ValidationError

from core.mapper import ConfigMapper
from core.operators import OperatorRegistry
from core.orchestrator import CheckpointStore, PipelineOrchestrator
from workers.bridge import run_pipeline


class JsonFormatter(logging.Formatter):
    """Output structured JSON log lines for machine parsing."""

    def format(self, record: logging.LogRecord) -> str:
        obj: dict[str, object] = {
            "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "lvl": record.levelname,
            "msg": record.getMessage(),
        }
        for key in ("cid", "run_id", "elapsed_ms", "dry", "len", "err"):
            val = getattr(record, key, None)
            if val is not None:
                obj[key] = val
        return json.dumps(obj, default=str)


_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter())
log = logging.getLogger("worker")
log.addHandler(_handler)
log.setLevel(logging.INFO)

MAX_PAYLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
REQUIRED_ENV_KEYS = ["AI_API_KEY"]


class PipelineHandler(BaseHTTPRequestHandler):
    """HTTP handler that wraps ``PipelineOrchestrator``."""

    dry_run: bool = False

    # ------------------------------------------------------------------
    # Override BaseHTTPRequestHandler defaults
    # ------------------------------------------------------------------
    def handle_one_request(self) -> None:
        """Add a wall-clock deadline to every request."""
        self._start_ns = time.perf_counter_ns()
        try:
            super().handle_one_request()
        except ConnectionError:
            pass  # client disconnected — not worth logging as error
        except Exception:
            log.exception("Unhandled handler error")
            self._send_json(500, {"error": "internal server error"})

    def log_message(self, fmt: str, *args: object) -> None:
        log.info(fmt, *args)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _correlation_id(self) -> str:
        return self.headers.get("X-Correlation-Id", "")

    def _elapsed_ms(self) -> float:
        try:
            return round((time.perf_counter_ns() - self._start_ns) / 1_000_000, 1)
        except AttributeError:
            return 0.0

    def _send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ------------------------------------------------------------------
    # Routes
    # ------------------------------------------------------------------
    def do_GET(self) -> None:
        if self.path == "/health":
            return self._health()

        if self.path == "/health/ready":
            return self._readiness()

        if self.path == "/runs":
            return self._list_runs()

        if self.path.startswith("/runs/"):
            run_id = self.path.split("/runs/", 1)[1]
            return self._get_run(run_id)

        self._send_json(404, {"error": "not found"})

    def _health(self) -> None:
        info: dict[str, object] = {
            "status": "ok",
            "dry_run": self.dry_run,
            "python_version": os.sys.version.split()[0],
            "pid": os.getpid(),
        }
        self._send_json(200, info)

    def _readiness(self) -> None:
        missing = [k for k in REQUIRED_ENV_KEYS if not os.environ.get(k)]
        if missing:
            return self._send_json(
                503,
                {
                    "status": "unready",
                    "missing_env": missing,
                },
            )
        self._send_json(200, {"status": "ready"})

    # ------------------------------------------------------------------
    # Run history
    # ------------------------------------------------------------------
    def _list_runs(self) -> None:
        runs_dir = Path("runs")
        entries: list[dict[str, object]] = []
        if runs_dir.is_dir():
            files = sorted(
                runs_dir.glob("*.json"),
                key=lambda f: f.stat().st_mtime,
                reverse=True,
            )[:100]
            for fp in files:
                try:
                    data = json.loads(fp.read_text(encoding="utf-8"))
                except Exception:
                    continue
                entries.append({
                    "run_id": data.get("run_id"),
                    "status": data.get("status", "unknown"),
                    "completed_steps": len(data.get("completed_steps", [])),
                    "failed_step": data.get("failed_step"),
                    "started_at": data.get("started_at"),
                    "finished_at": data.get("finished_at"),
                    "elapsed_ms": data.get("elapsed_ms"),
                })
        self._send_json(200, entries)

    def _get_run(self, run_id: str) -> None:
        fp = Path(f"runs/{run_id}.json")
        if not fp.exists():
            self._send_json(404, {"error": "run not found", "run_id": run_id})
            return
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as exc:
            self._send_json(500, {"error": f"failed to read run: {exc}"})
            return
        self._send_json(200, data)

    def do_POST(self) -> None:
        cid = self._correlation_id()

        if self.path not in ("/run", "/dry-run"):
            return self._send_json(404, {"error": "not found"})

        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return self._send_json(400, {"error": "empty body"})
        if length > MAX_PAYLOAD_BYTES:
            return self._send_json(413, {"error": "payload too large"})

        raw = self.rfile.read(length)
        try:
            config = json.loads(raw)
        except json.JSONDecodeError as exc:
            return self._send_json(400, {"error": f"invalid JSON: {exc}"})

        is_dry = self.path == "/dry-run" or self.dry_run
        run_id = str(uuid4())

        log.info(
            "run",
            extra={"cid": cid, "run_id": run_id, "dry": is_dry, "len": length},
        )

        orchestrator = PipelineOrchestrator(
            mapper=ConfigMapper(),
            registry=OperatorRegistry(dry_run=is_dry),
            checkpoint_store=CheckpointStore(f"runs/{run_id}.json"),
        )

        try:
            result = orchestrator.run(
                raw_config=config,
                run_id=run_id,
                resume=False,
            )
            elapsed = self._elapsed_ms()
            log.info("ok", extra={"cid": cid, "run_id": run_id, "elapsed_ms": elapsed})
            result["_elapsed_ms"] = elapsed

            # Enrich run record with final status
            ckpt = Path(f"runs/{run_id}.json")
            if ckpt.exists():
                record = json.loads(ckpt.read_text(encoding="utf-8"))
                record["status"] = "completed"
                record["finished_at"] = (
                    datetime.datetime.now(datetime.timezone.utc).isoformat()
                )
                record["elapsed_ms"] = elapsed
                record["results"] = result.get("context", {}).get("results", {})
                ckpt.write_text(json.dumps(record, indent=2), encoding="utf-8")

            self._send_json(200, result)
        except ValidationError as exc:
            elapsed = self._elapsed_ms()
            log.warning(
                "vali",
                extra={
                    "cid": cid,
                    "run_id": run_id,
                    "elapsed_ms": elapsed,
                    "err": str(exc),
                },
            )
            try:
                details = json.loads(exc.json())
            except Exception:
                details = str(exc)
            self._send_json(400, {
                "error": "config validation failed",
                "run_id": run_id,
                "details": details,
                "traceback": traceback.format_exc(),
            })
        except Exception as exc:
            elapsed = self._elapsed_ms()
            log.error(
                "fail",
                extra={
                    "cid": cid,
                    "run_id": run_id,
                    "elapsed_ms": elapsed,
                    "err": str(exc),
                },
            )
            # Enrich run record on failure
            ckpt = Path(f"runs/{run_id}.json")
            if ckpt.exists():
                record = json.loads(ckpt.read_text(encoding="utf-8"))
                record["status"] = "failed"
                record["finished_at"] = (
                    datetime.datetime.now(datetime.timezone.utc).isoformat()
                )
                record["elapsed_ms"] = elapsed
                record["error"] = str(exc)
                record["traceback"] = traceback.format_exc()
                ckpt.write_text(json.dumps(record, indent=2), encoding="utf-8")
            self._send_json(500, {
                "error": str(exc),
                "run_id": run_id,
                "traceback": traceback.format_exc(),
            })


def run_server(
    host: str = "127.0.0.1",
    port: int = 9120,
    dry_run: bool = False,
) -> None:
    server = HTTPServer((host, port), PipelineHandler)
    PipelineHandler.dry_run = dry_run
    print(f"Pipeline worker listening on http://{host}:{port}  (dry_run={dry_run})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9120)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run_server(host=args.host, port=args.port, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
