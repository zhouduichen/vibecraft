from __future__ import annotations

from core.mapper import InternalOperatorParams

from .base import Operator, OperatorResult, PipelineContext


class DryRunOperator:
    """Operator that validates params and returns metadata without real execution."""

    def run(
        self,
        params: InternalOperatorParams,
        context: PipelineContext,
    ) -> OperatorResult:
        return OperatorResult(
            component_id=params.component_id,
            operator=params.operator.value,
            success=True,
            output={
                "dry_run": True,
                "validated_payload_keys": sorted(params.payload.keys()),
                "depends_on": params.depends_on,
            },
        )
