from __future__ import annotations

import datetime
import json
import traceback
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from core.mapper import ConfigMapper, InternalOperatorParams, PipelinePlan
from core.operators import (
    Operator,
    OperatorRegistry,
    PipelineContext,
    timed_run,
)


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PipelineState:
    run_id: str
    current_step: str | None
    completed_steps: list[str]
    failed_step: str | None = None
    error: str | None = None
    started_at: str | None = None
    traceback: str | None = None


class CheckpointStore:
    def __init__(self, path: str = ".pipeline_state.json"):
        self.path = Path(path)

    def load(self) -> PipelineState | None:
        if not self.path.exists():
            return None
        return PipelineState(**json.loads(self.path.read_text(encoding="utf-8")))

    def save(self, state: PipelineState) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(asdict(state), indent=2), encoding="utf-8")


class PipelineOrchestrator:
    def __init__(
        self,
        mapper: ConfigMapper,
        registry: OperatorRegistry,
        checkpoint_store: CheckpointStore,
    ):
        self.mapper = mapper
        self.registry = registry
        self.checkpoints = checkpoint_store

    def run(self, raw_config: dict, run_id: str, resume: bool = True) -> dict:
        state = self.checkpoints.load() if resume else None
        if state is None:
            state = PipelineState(
                run_id=run_id,
                current_step=None,
                completed_steps=[],
                started_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            )

        context = PipelineContext()

        try:
            self._load_assets(raw_config, state, context)

            plan = self._validate_and_map(raw_config, state)

            ordered_operators = self._validate_dependencies(plan, state)

            self._execute_operators(ordered_operators, state, context)

            self._render_or_export(plan, state, context)

            return {"status": "ok", "run_id": run_id, "context": context.model_dump()}

        except Exception as exc:
            state.failed_step = state.current_step
            state.error = str(exc)
            state.traceback = traceback.format_exc()
            self.checkpoints.save(state)
            raise

    def _mark_running(self, state: PipelineState, step: str) -> None:
        state.current_step = step
        self.checkpoints.save(state)

    def _mark_done(self, state: PipelineState, step: str) -> None:
        if step not in state.completed_steps:
            state.completed_steps.append(step)
        state.current_step = None
        self.checkpoints.save(state)

    def _should_skip(self, state: PipelineState, step: str) -> bool:
        return step in state.completed_steps

    def _load_assets(
        self,
        raw_config: dict,
        state: PipelineState,
        context: PipelineContext,
    ) -> None:
        step = "load_assets"
        if self._should_skip(state, step):
            return

        self._mark_running(state, step)
        for asset in raw_config.get("assets", []):
            asset_id = asset.get("id") if isinstance(asset, dict) else None
            if asset_id:
                context.assets[asset_id] = asset.get("path")
        self._mark_done(state, step)

    def _validate_and_map(self, raw_config: dict, state: PipelineState) -> PipelinePlan:
        step = "validate_params"
        if not self._should_skip(state, step):
            self._mark_running(state, step)
            plan = self.mapper.map(raw_config)
            self._mark_done(state, step)
            return plan

        return self.mapper.map(raw_config)

    def _validate_dependencies(
        self,
        plan: PipelinePlan,
        state: PipelineState,
    ) -> list[InternalOperatorParams]:
        step = "validate_dependencies"
        if not self._should_skip(state, step):
            self._mark_running(state, step)
            ordered = self._topological_order(plan)
            self._mark_done(state, step)
            return ordered

        return self._topological_order(plan)

    def _topological_order(self, plan: PipelinePlan) -> list[InternalOperatorParams]:
        by_id = {params.component_id: params for params in plan.operators}
        if len(by_id) != len(plan.operators):
            raise ValueError("duplicate component id in pipeline plan")

        for params in plan.operators:
            for dependency in params.depends_on:
                if dependency not in by_id:
                    raise ValueError(
                        f"missing dependency for '{params.component_id}': '{dependency}'"
                    )

        ordered: list[InternalOperatorParams] = []
        visiting: set[str] = set()
        visited: set[str] = set()
        stack: list[str] = []

        def visit(component_id: str) -> None:
            if component_id in visited:
                return
            if component_id in visiting:
                start = stack.index(component_id)
                cycle = stack[start:] + [component_id]
                raise ValueError(f"dependency cycle detected: {' -> '.join(cycle)}")

            visiting.add(component_id)
            stack.append(component_id)
            for dependency in by_id[component_id].depends_on:
                visit(dependency)
            stack.pop()
            visiting.remove(component_id)
            visited.add(component_id)
            ordered.append(by_id[component_id])

        for params in plan.operators:
            visit(params.component_id)

        return ordered

    def _execute_operators(
        self,
        operators: list[InternalOperatorParams],
        state: PipelineState,
        context: PipelineContext,
    ) -> None:
        for params in operators:
            step = f"operator:{params.component_id}"
            if self._should_skip(state, step):
                continue

            self._mark_running(state, step)
            result = self.registry.run(params.operator.value, params, context)
            context.results[params.component_id] = result.model_dump()
            if not result.success:
                raise RuntimeError(
                    f"Operator '{params.component_id}' ({params.operator.value}) "
                    f"failed: {result.error}"
                )
            self._mark_done(state, step)

    def _render_or_export(
        self,
        plan: PipelinePlan,
        state: PipelineState,
        context: PipelineContext,
    ) -> None:
        step = "render_export"
        if self._should_skip(state, step):
            return

        self._mark_running(state, step)
        context.metadata["exported"] = True
        self._mark_done(state, step)
