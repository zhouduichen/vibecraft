from __future__ import annotations

import argparse
import json
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

from core.mapper import ConfigMapper
from core.operators import OperatorRegistry
from core.orchestrator import CheckpointStore, PipelineOrchestrator


def load_config(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--checkpoint", default=".pipeline_state.json")
    args = parser.parse_args()

    raw_config = load_config(args.config)

    orchestrator = PipelineOrchestrator(
        mapper=ConfigMapper(),
        registry=OperatorRegistry(dry_run=args.dry_run),
        checkpoint_store=CheckpointStore(args.checkpoint),
    )

    try:
        result = orchestrator.run(
            raw_config=raw_config,
            run_id=str(uuid4()),
            resume=args.resume,
        )
    except ValidationError as exc:
        print(exc.json(indent=2))
        return 2
    except Exception as exc:
        print(f"pipeline failed: {exc}")
        return 1

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
