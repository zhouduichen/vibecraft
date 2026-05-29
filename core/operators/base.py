from __future__ import annotations

import time
import traceback
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from core.mapper import InternalOperatorParams


class PipelineContext(BaseModel):
    """Shared state that flows through the pipeline execution.

    - ``assets``: loaded input assets (file paths, buffers), keyed by asset ID.
    - ``results``: outputs produced by each operator, keyed by component ID.
    - ``metadata``: run-level information (timestamps, resolved config, etc.).
    """

    model_config = ConfigDict(extra="forbid")

    assets: dict[str, Any] = Field(default_factory=dict)
    results: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OperatorResult(BaseModel):
    """Structured result returned by every operator after execution."""

    model_config = ConfigDict(extra="forbid")

    component_id: str
    operator: str
    success: bool = True
    output: Any = None
    error: str | None = None
    duration_ms: float | None = None


class Operator(Protocol):
    """Contract every pipeline operator must satisfy."""

    def run(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
    ) -> OperatorResult:
        ...


def timed_run(
    operator: Operator,
    params: InternalOperatorParams,
    context: PipelineContext,
) -> OperatorResult:
    """Wrap an operator call with automatic duration measurement."""
    start = time.perf_counter()
    try:
        result = operator.run(params, context)
        result.duration_ms = round((time.perf_counter() - start) * 1000, 1)
        return result
    except Exception as exc:
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=False,
            error=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
            duration_ms=elapsed,
        )
