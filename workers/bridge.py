from __future__ import annotations

import json
import os
import sys
from uuid import uuid4

from core.mapper import ConfigMapper
from core.operators import OperatorRegistry
from core.orchestrator import CheckpointStore, PipelineOrchestrator


def run_pipeline(config: dict, dry_run: bool = False) -> dict:
    """Execute a pipeline config and return the result dict.

    This is the shared entry point used by both the HTTP server
    (``server.py``) and the subprocess bridge (``bridge.py``).
    """
    orchestrator = PipelineOrchestrator(
        mapper=ConfigMapper(),
        registry=OperatorRegistry(dry_run=dry_run),
        checkpoint_store=CheckpointStore(os.devnull),
    )

    return orchestrator.run(
        raw_config=config,
        run_id=str(uuid4()),
        resume=False,
    )


def main() -> None:
    """Read config JSON from stdin, write result JSON to stdout."""
    raw = sys.stdin.read()
    if not raw:
        print(json.dumps({"error": "empty stdin"}), file=sys.stderr)
        sys.exit(1)

    try:
        config = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"invalid JSON: {exc}"}), file=sys.stderr)
        sys.exit(1)

    dry_run = os.environ.get("WORKER_DRY_RUN", "0") == "1"

    try:
        result = run_pipeline(config, dry_run=dry_run)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
